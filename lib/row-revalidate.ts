// Точечная перестройка страниц по списку изменившихся записей.
//
// Источник списка — очередь в базе (миграция 146): триггеры на raw_* таблицах,
// на site_content и на манифестах в Storage складывают «что поменялось», а
// pg_cron пачкой шлёт это в /api/revalidate-rows. Скрипты, SQL руками, воркер —
// всё теперь обновляет сайт само, без выкладки и без ручного revalidate.
//
// Чем это отличается от /api/revalidate-content и lib/admin/revalidate.ts:
// те сбрасывают ВЕСЬ вид (тег content:<kind> + маршрут /…/[slug]) — то есть
// каждая вилла на всех десяти языках пересобирается при следующем заходе
// краулера. Здесь — только страницы затронутых записей:
//   • revalidatePath конкретного адреса на десяти языках. Данные, прочитанные
//     при перестройке этой страницы, тоже считаются устаревшими (неявные теги
//     пути), поэтому unstable_cache с общими таблицами отдаст свежее;
//   • bumpContentRev(kind) — сброс памяти инстансов (каталоги, by-id кэши);
//   • теги content:<kind> НЕ трогаем: тег пометил бы устаревшими все страницы.
// Если записей одного вида в пачке слишком много (массовый синк), выгоднее и
// честнее сбросить вид целиком — это стоит столько же, сколько одна правка в
// админке.

import { revalidatePath, revalidateTag } from 'next/cache'
import { createHash } from 'node:crypto'
import { LANGS, switchLangPath } from './i18n'
import { KIND_TO_PATHS, KIND_TO_TAGS } from './content-revalidate-map'
import { bumpContentRev } from './content-version'
import { adminSb } from './admin/sb'
import { COLLECTIONS } from './admin/collections'
import { syncDetailIndexEntry } from './admin/detail-index'
import { normalizeSlug } from './slug-normalize'
import { enKnowledgeSlug } from './knowledge-en-slugs'

export type ChangeItem = { kind: string; id: string; op?: string; index?: boolean }

export type RevalidateSummary = {
  paths: number
  /** Первые 200 адресов — для журнала и проверки. */
  list: string[]
  kindWide: string[]
  bumped: string[]
  baselined: string[]
  skipped: string[]
}

// Больше стольких записей одного вида в пачке — сбрасываем вид целиком.
const KIND_CAP = 150
// Точечно чинить индекс слагов дороже (чтение+запись файла на запись) —
// больше стольких созданий/переименований оставляем ночному
// scripts/sync-detail-indexes.mjs.
const INDEX_PATCH_CAP = 30
// Сколько юнитов ЖК перестраивать вместе с ним (документы, генплан на
// страницах вилл). Больше — юниты дождутся своего TTL.
const UNITS_PER_COMPLEX_CAP = 40

const DETAIL_RU: Record<string, string> = {
  villas: '/ru/villy/o/',
  apartments: '/ru/apartamenty/o/',
  complexes: '/ru/zhilye-kompleksy/o/',
  developers: '/ru/zastrojshhiki/',
  news: '/ru/novosti/',
  events: '/ru/meropriyatiya/',
  promo: '/ru/akcii/',
  knowledge: '/ru/znaniya/',
  rental: '/ru/arenda/o/',
}
const LIST_RU: Record<string, string> = {
  villas: '/ru/villy',
  apartments: '/ru/apartamenty',
  complexes: '/ru/zhilye-kompleksy',
  developers: '/ru/zastrojshhiki',
  news: '/ru/novosti',
  events: '/ru/meropriyatiya',
  promo: '/ru/akcii',
  knowledge: '/ru/znaniya',
  rental: '/ru/arenda',
}
const INDEX_KEY: Record<string, string> = {
  villas: '_villas-index.json',
  apartments: '_apartments-index.json',
  complexes: '_complexes-index.json',
}
const ROW_KINDS = new Set(['villas', 'apartments', 'complexes', 'developers'])

// Манифесты Storage → вид контента. Фото-манифесты ({ id: [url…] }) дают
// изменившиеся id записей; контентные ({ items: [...] }) — элементы ленты.
const PHOTO_MANIFESTS: Record<string, string> = {
  'villa-photos/_manifest.json': 'villas',
  'apartment-photos/_manifest.json': 'apartments',
  'complex-photos/_manifest.json': 'complexes',
}
const ITEM_MANIFESTS: Record<string, string> = {
  'news/_news.json': 'news',
  'events/_events.json': 'events',
  'promo/_promo.json': 'promo',
  'knowledge/_knowledge.json': 'knowledge',
  'rental/_rental.json': 'rental',
  'managers/_managers.json': 'managers',
  'feeds/_videos.json': 'videos',
}

class PathSet {
  readonly set = new Set<string>()
  /** RU-адрес → все десять языков. */
  addAllLangs(ruPath: string) {
    for (const lang of LANGS) this.set.add(switchLangPath(ruPath, lang))
  }
  add(path: string) { this.set.add(path) }
}

function firstString(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return firstString(v[0])
  return null
}

function asStrings(v: unknown): string[] {
  if (v == null) return []
  if (Array.isArray(v)) return v.map(firstString).filter((s): s is string => !!s)
  const s = firstString(v)
  return s ? [s] : []
}

type IndexEntry = { id: string; slug: string; aliases?: string[] }

async function readIndexSlugs(key: string): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  const { data, error } = await adminSb().storage.from('feeds').download(key)
  if (error || !data) return out
  try {
    const j = JSON.parse(await data.text()) as { items?: IndexEntry[] }
    for (const it of j.items ?? []) {
      if (!it?.id || !it.slug) continue
      out.set(it.id, [it.slug, ...(it.aliases ?? [])])
    }
  } catch { /* битый файл — без слагов, ночная пересборка починит */ }
  return out
}

function kindWide(kind: string): void {
  const tag = KIND_TO_TAGS[kind]
  if (tag) revalidateTag(tag, 'max')
  for (const route of KIND_TO_PATHS[kind] ?? []) revalidatePath(route.path, route.type)
}

async function developerSlugs(where: { ids?: string[]; names?: string[] }): Promise<string[]> {
  const sb = adminSb()
  const out = new Set<string>()
  if (where.ids?.length) {
    const { data } = await sb.from('raw_developers').select('slug:data->>"SEO:Slug"').in('airtable_id', where.ids)
    for (const r of (data ?? []) as { slug: string | null }[]) if (r.slug) out.add(r.slug.trim())
  }
  if (where.names?.length) {
    const { data } = await sb.from('raw_developers').select('slug:data->>"SEO:Slug"').in('data->>Developer', where.names)
    for (const r of (data ?? []) as { slug: string | null }[]) if (r.slug) out.add(r.slug.trim())
  }
  return [...out]
}

// ---------------------------------------------------------------------------
// Записи raw_* (виллы, апартаменты, ЖК, застройщики)

async function rowKind(kind: string, items: ChangeItem[], paths: PathSet, sum: RevalidateSummary, complexIndex: () => Promise<Map<string, string[]>>) {
  if (items.length > KIND_CAP) {
    kindWide(kind)
    sum.kindWide.push(kind)
    return
  }
  const sb = adminSb()
  const ids = [...new Set(items.map(i => i.id))]
  const indexKey = INDEX_KEY[kind]

  // Слаги: и до, и после правки индекса — переименованная запись должна
  // сбросить и старый адрес (там теперь редирект), и новый.
  const slugsById = new Map<string, Set<string>>()
  const addSlugs = (m: Map<string, string[]>) => {
    for (const id of ids) for (const s of m.get(id) ?? []) {
      if (!slugsById.has(id)) slugsById.set(id, new Set())
      slugsById.get(id)!.add(s)
    }
  }
  const indexed = items.filter(i => i.index)
  if (indexKey) {
    addSlugs(await readIndexSlugs(indexKey))
    if (indexed.length && indexed.length <= INDEX_PATCH_CAP) {
      const cfg = COLLECTIONS[kind]
      for (const it of indexed) await syncDetailIndexEntry(cfg, it.id)
      addSlugs(await readIndexSlugs(indexKey))
    }
  }

  const devIds = new Set<string>()
  const devNames = new Set<string>()
  const complexIds = new Set<string>()
  const complexNames = new Set<string>()

  if (kind === 'villas' || kind === 'apartments') {
    const table = kind === 'villas' ? 'raw_villas' : 'raw_apartments'
    const { data } = await sb.from(table)
      .select('airtable_id, c:data->"Комплекс", c1:data->"Комплекс 1", d:data->"Developer"')
      .in('airtable_id', ids)
    for (const r of (data ?? []) as { c: unknown; c1: unknown; d: unknown }[]) {
      for (const c of asStrings(r.c)) (c.startsWith('rec') || c.startsWith('adm_') ? complexIds : complexNames).add(c)
      for (const c of asStrings(r.c1)) complexNames.add(c)
      for (const d of asStrings(r.d)) devIds.add(d)
    }
  } else if (kind === 'complexes') {
    const { data } = await sb.from('raw_complexes').select('airtable_id, d:data->"Developer"').in('airtable_id', ids)
    for (const r of (data ?? []) as { d: unknown }[]) {
      for (const d of asStrings(r.d)) (d.startsWith('rec') || d.startsWith('adm_') ? devIds : devNames).add(d)
    }
    for (const id of ids) await unitPathsOfComplex(id, paths)
  } else if (kind === 'developers') {
    const { data } = await sb.from('raw_developers').select('airtable_id, slug:data->>"SEO:Slug"').in('airtable_id', ids)
    for (const r of (data ?? []) as { airtable_id: string; slug: string | null }[]) {
      if (!r.slug) continue
      if (!slugsById.has(r.airtable_id)) slugsById.set(r.airtable_id, new Set())
      slugsById.get(r.airtable_id)!.add(r.slug.trim())
    }
  }

  // Своя страница каждой записи.
  for (const set of slugsById.values()) for (const slug of set) paths.addAllLangs(DETAIL_RU[kind] + slug)

  // Родители: страница ЖК и застройщика показывают юниты с ценами.
  if (complexNames.size) {
    const { data } = await sb.from('raw_complexes').select('airtable_id').in('data->>Project', [...complexNames])
    for (const r of (data ?? []) as { airtable_id: string }[]) complexIds.add(r.airtable_id)
  }
  if (complexIds.size) {
    const cidx = await complexIndex()
    for (const id of complexIds) for (const slug of cidx.get(id) ?? []) paths.addAllLangs(DETAIL_RU.complexes + slug)
  }
  for (const slug of await developerSlugs({ ids: [...devIds], names: [...devNames] })) {
    paths.addAllLangs(DETAIL_RU.developers + slug)
  }

  // Новая / снятая / переименованная запись меняет списки и карту сайта.
  if (indexed.length) {
    paths.addAllLangs(LIST_RU[kind])
    paths.add('/sitemap/[id]')
    // Счётчики объектов в /llms.txt считаются из каталога (app/llms-live.txt).
    paths.add('/llms-live.txt')
    if (kind !== 'developers') paths.addAllLangs('/ru')
  }

  await bumpContentRev(kind).catch(e => console.error('[row-revalidate] bump', kind, e))
  sum.bumped.push(kind)
}

/** Страницы юнитов ЖК (виллы по id ЖК, апартаменты по названию проекта). */
async function unitPathsOfComplex(complexId: string, paths: PathSet): Promise<void> {
  const sb = adminSb()
  const { data: c } = await sb.from('raw_complexes').select('project:data->>"Project"').eq('airtable_id', complexId).maybeSingle()
  const project = (c as { project: string | null } | null)?.project ?? null
  const none = Promise.resolve({ data: [] as { airtable_id: string }[] })
  // Виллы связаны с ЖК по id, но у части юнитов в «Комплекс» старый id —
  // поэтому ещё и по названию проекта, как scripts/build-verified-yield.mjs.
  const [villas, villasByName, apts] = await Promise.all([
    sb.from('raw_villas').select('airtable_id').filter('data->"Комплекс"', 'cs', JSON.stringify([complexId])).limit(UNITS_PER_COMPLEX_CAP + 1),
    project ? sb.from('raw_villas').select('airtable_id').eq('data->>"Комплекс 1"', project).limit(UNITS_PER_COMPLEX_CAP + 1) : none,
    project ? sb.from('raw_apartments').select('airtable_id').eq('data->>"Комплекс 1"', project).limit(UNITS_PER_COMPLEX_CAP + 1) : none,
  ])
  const villaIds = [...new Set([...(villas.data ?? []), ...(villasByName.data ?? [])].map(r => (r as { airtable_id: string }).airtable_id))]
  const aptIds = ((apts.data ?? []) as { airtable_id: string }[]).map(r => r.airtable_id)
  if (villaIds.length + aptIds.length > UNITS_PER_COMPLEX_CAP) return
  if (villaIds.length) {
    const idx = await readIndexSlugs(INDEX_KEY.villas)
    for (const id of villaIds) for (const s of idx.get(id) ?? []) paths.addAllLangs(DETAIL_RU.villas + s)
  }
  if (aptIds.length) {
    const idx = await readIndexSlugs(INDEX_KEY.apartments)
    for (const id of aptIds) for (const s of idx.get(id) ?? []) paths.addAllLangs(DETAIL_RU.apartments + s)
  }
}

// ---------------------------------------------------------------------------
// Манифесты Storage: ищем изменившиеся элементы по снимку хэшей.

type StateRow = { item_id: string; hash: string; meta: { slug?: string; devs?: string[]; complexes?: string[] } | null }

async function downloadManifest(key: string): Promise<unknown | null> {
  const slash = key.indexOf('/')
  const { data, error } = await adminSb().storage.from(key.slice(0, slash)).download(key.slice(slash + 1))
  if (error || !data) return null
  try { return JSON.parse(await data.text()) } catch { return null }
}

const hashOf = (v: unknown) => createHash('sha1').update(JSON.stringify(v)).digest('hex')

type Entry = { id: string; hash: string; meta: StateRow['meta'] }

function manifestEntries(key: string, json: unknown): Entry[] {
  if (PHOTO_MANIFESTS[key]) {
    if (!json || typeof json !== 'object' || Array.isArray(json)) return []
    return Object.entries(json as Record<string, unknown>).map(([id, v]) => ({ id, hash: hashOf(v), meta: null }))
  }
  const items = (json as { items?: unknown[] } | null)?.items
  if (!Array.isArray(items)) return []
  const out: Entry[] = []
  for (const raw of items) {
    const it = raw as Record<string, unknown>
    const id = firstString(it?.id) ?? firstString(it?.slug)
    if (!id) continue
    const devs = Array.isArray(it.developers)
      ? (it.developers as { slug?: unknown }[]).map(d => firstString(d?.slug)).filter((s): s is string => !!s)
      : []
    const complexes = Array.isArray(it.complexes)
      ? (it.complexes as { slug?: unknown }[]).map(d => firstString(d?.slug)).filter((s): s is string => !!s)
      : []
    out.push({ id, hash: hashOf(it), meta: { slug: firstString(it.slug) ?? undefined, devs, complexes } })
  }
  return out
}

async function readState(key: string): Promise<Map<string, StateRow>> {
  const out = new Map<string, StateRow>()
  const sb = adminSb()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('content_manifest_state')
      .select('item_id, hash, meta').eq('manifest', key).range(from, from + 999)
    if (error) throw new Error(`content_manifest_state: ${error.message}`)
    for (const r of (data ?? []) as StateRow[]) out.set(r.item_id, r)
    if (!data || data.length < 1000) break
  }
  return out
}

async function writeState(key: string, entries: Entry[], removed: string[]): Promise<void> {
  const sb = adminSb()
  const now = new Date().toISOString()
  for (let i = 0; i < entries.length; i += 500) {
    const chunk = entries.slice(i, i + 500).map(e => ({ manifest: key, item_id: e.id, hash: e.hash, meta: e.meta, updated_at: now }))
    const { error } = await sb.from('content_manifest_state').upsert(chunk, { onConflict: 'manifest,item_id' })
    if (error) throw new Error(`content_manifest_state upsert: ${error.message}`)
  }
  for (let i = 0; i < removed.length; i += 200) {
    await sb.from('content_manifest_state').delete().eq('manifest', key).in('item_id', removed.slice(i, i + 200))
  }
}

async function newsEnSlugs(): Promise<Map<string, string>> {
  const { loadAllNews } = await import('./news')
  const out = new Map<string, string>()
  for (const n of await loadAllNews('en').catch(() => [])) if (n.id && n.slug) out.set(n.id, n.slug)
  return out
}

async function manifestChange(key: string, rowItems: Map<string, ChangeItem[]>, paths: PathSet, sum: RevalidateSummary) {
  const kind = PHOTO_MANIFESTS[key] ?? ITEM_MANIFESTS[key]
  if (!kind) { sum.skipped.push(key); return }
  const json = await downloadManifest(key)
  if (json == null) { sum.skipped.push(key); return }
  const entries = manifestEntries(key, json)
  if (!entries.length) { sum.skipped.push(key); return }
  const state = await readState(key)
  const live = new Set(entries.map(e => e.id))
  const removed = [...state.keys()].filter(id => !live.has(id))

  // Первая встреча с файлом — только снимок, без перестроек: сравнивать не с чем.
  if (state.size === 0) {
    await writeState(key, entries, [])
    sum.baselined.push(key)
    return
  }
  const changed = entries.filter(e => state.get(e.id)?.hash !== e.hash)
  const gone = removed.map(id => ({ id, hash: '', meta: state.get(id)?.meta ?? null }))
  const touched = [...changed, ...gone]
  if (!touched.length) return

  if (PHOTO_MANIFESTS[key]) {
    // Фото записи поменялись — это та же правка записи, без смены индекса.
    const list = rowItems.get(kind) ?? []
    for (const e of touched) list.push({ kind, id: e.id, op: 'PHOTO', index: false })
    rowItems.set(kind, list)
  } else if (kind === 'managers' || touched.length > KIND_CAP) {
    // Менеджеры висят на страницах всех объектов — без точной привязки.
    kindWide(kind)
    sum.kindWide.push(kind)
  } else {
    const detail = DETAIL_RU[kind]
    const enSlugs = kind === 'news' ? await newsEnSlugs() : null
    for (const e of touched) {
      const slug = e.meta?.slug
      if (detail && slug) {
        paths.addAllLangs(detail + slug)
        // Нерусские деревья новостей и знаний живут на английском слаге.
        const en = kind === 'news' ? enSlugs?.get(e.id) : kind === 'knowledge' ? enKnowledgeSlug(slug) : null
        if (en && en !== slug) for (const lang of LANGS) if (lang !== 'ru') paths.add(switchLangPath(detail + en, lang))
      }
      for (const d of e.meta?.devs ?? []) paths.addAllLangs(DETAIL_RU.developers + d)
      for (const c of e.meta?.complexes ?? []) paths.addAllLangs(DETAIL_RU.complexes + normalizeSlug(c))
    }
    if (LIST_RU[kind]) paths.addAllLangs(LIST_RU[kind])
    if (changed.some(e => !state.has(e.id)) || gone.length) paths.add('/sitemap/[id]')
    await bumpContentRev(kind).catch(e => console.error('[row-revalidate] bump', kind, e))
    sum.bumped.push(kind)
  }
  await writeState(key, changed, removed)
}

// ---------------------------------------------------------------------------
// site_content (миграция 147): '<раздел>|<элемент>'

async function siteContentChange(rowId: string, rowItems: Map<string, ChangeItem[]>, paths: PathSet, complexIndex: () => Promise<Map<string, string[]>>, sum: RevalidateSummary) {
  const sep = rowId.indexOf('|')
  const section = rowId.slice(0, sep)
  const item = rowId.slice(sep + 1)
  const complexBySlug = async (slug: string) => {
    for (const [id, slugs] of await complexIndex()) if (slugs.includes(slug)) return id
    return null
  }
  switch (section) {
    case 'complex-docs':
    case 'sun-plans': {
      // Плитка документов и генплан есть и на странице ЖК, и на страницах его юнитов.
      paths.addAllLangs(DETAIL_RU.complexes + item)
      const id = await complexBySlug(item)
      if (id) await unitPathsOfComplex(id, paths)
      return
    }
    case '3d-plans': {
      const [k, slug] = item.split(':')
      if (k === 'villa') paths.addAllLangs(DETAIL_RU.villas + slug)
      else if (k === 'apartment') paths.addAllLangs(DETAIL_RU.apartments + slug)
      return
    }
    case 'verified-yield': {
      // элемент — '<kind>:<airtable_id>': как правка самой записи.
      const [k, id] = item.split(':')
      if (ROW_KINDS.has(k) && id) {
        const list = rowItems.get(k) ?? []
        list.push({ kind: k, id, op: 'SITE', index: false })
        rowItems.set(k, list)
      }
      return
    }
    case 'unit-grid': {
      // Шахматка: элемент — airtable_id ЖК. Она есть на странице ЖК и застройщика.
      const list = rowItems.get('complexes') ?? []
      list.push({ kind: 'complexes', id: item, op: 'SITE', index: false })
      rowItems.set('complexes', list)
      return
    }
    case 'market-index':
      // Ежемесячный индекс рынка: три страницы рынка, блок «в цифрах» на
      // главной и цифры на страницах «инвестиции в район».
      for (const ru of ['/ru/tseny-na-nedvizhimost-bali', '/ru/tseny-arendy-na-bali', '/ru/metodologiya', '/ru']) paths.addAllLangs(ru)
      paths.addAllLangs('/ru/investicii/[district]')
      return
    case 'knowledge-noindex':
      paths.addAllLangs(DETAIL_RU.knowledge + item)
      for (const lang of LANGS) if (lang !== 'ru') paths.add(switchLangPath(DETAIL_RU.knowledge + enKnowledgeSlug(item), lang))
      paths.add('/sitemap/[id]')
      return
    default:
      sum.skipped.push(rowId)
  }
}

// ---------------------------------------------------------------------------

export async function revalidateChanges(items: ChangeItem[]): Promise<RevalidateSummary> {
  const sum: RevalidateSummary = { paths: 0, list: [], kindWide: [], bumped: [], baselined: [], skipped: [] }
  const paths = new PathSet()
  const rowItems = new Map<string, ChangeItem[]>()
  let _cidx: Promise<Map<string, string[]>> | null = null
  const complexIndex = () => (_cidx ??= readIndexSlugs(INDEX_KEY.complexes))

  for (const it of items) {
    if (!it || typeof it.kind !== 'string' || typeof it.id !== 'string') continue
    if (ROW_KINDS.has(it.kind)) {
      const list = rowItems.get(it.kind) ?? []
      list.push(it)
      rowItems.set(it.kind, list)
    }
  }
  // Сначала манифесты и site_content: они могут добавить записи в rowItems.
  for (const it of items) {
    if (it?.kind === 'manifest') await manifestChange(it.id, rowItems, paths, sum)
    else if (it?.kind === 'site_content') await siteContentChange(it.id, rowItems, paths, complexIndex, sum)
    else if (it && !ROW_KINDS.has(it.kind)) sum.skipped.push(`${it.kind}:${it.id}`)
  }
  for (const [kind, list] of rowItems) await rowKind(kind, list, paths, sum, complexIndex)

  for (const p of paths.set) {
    // Шаблон маршрута ('/…/[slug]') сбрасывает все его адреса — только там,
    // где это сознательно (карта сайта, ежемесячный индекс рынка).
    if (p.includes('[')) revalidatePath(p, 'page')
    else revalidatePath(p)
  }
  sum.paths = paths.set.size
  sum.list = [...paths.set].slice(0, 200)
  return sum
}
