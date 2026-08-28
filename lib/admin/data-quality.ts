import 'server-only'

// «Проблемы» — вкладка рядом с таблицей в /admin/data.
//
// Таблица показывает данные, но не показывает СМЫСЛ пустой ячейки: у ЖК без
// координат просто не выводится блок «Расположение», а у ЖК без слага нет
// страницы. Раньше это находили глазами, по одному объекту. Здесь каждая
// такая дыра описана правилом: что не так, чем это оборачивается на сайте и
// что сделать.
//
// Дёшево по egress: читаем не весь JSONB, а проекцию нужных ключей, и держим
// результат в unstable_cache с тем же тегом, который сбрасывает любая правка
// в админке (lib/admin/revalidate.ts), — то есть вкладка всегда свежая, но
// один и тот же скан не гоняется на каждый рендер.

import { unstable_cache } from 'next/cache'
import { adminSb, supabaseUrl } from './sb'
import { KIND_TO_TAGS } from '@/lib/content-revalidate-map'
import type { CollectionConfig } from './adapters/types'

export type Severity = 'critical' | 'warning' | 'info'

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Объект не работает',
  warning: 'Карточка неполная',
  info: 'Возможно, так и задумано',
}

export type IssueRule = {
  id: string
  severity: Severity
  /** Заголовок проблемы: «Нет геопозиции». */
  title: string
  /** Что из-за этого происходит на сайте — ради чего вообще чинить. */
  consequence: string
  /** Что сделать, словами того, кто заполняет таблицу. */
  fix: string
}

export type IssueRecord = { id: string; title: string; rules: string[] }

export type IssueReport = {
  collection: string
  scanned: number
  /** Только сработавшие правила: сначала критичные, внутри — частые. */
  rules: (IssueRule & { count: number; records: IssueRecord[] })[]
  /** Записи с проблемами: сначала самые «дырявые». */
  records: IssueRecord[]
  counts: Record<Severity, number>
  /** Скан не удался (нет связи с базой) — показываем причину, а не ноль. */
  error?: string
}

// --- helpers ---------------------------------------------------------------

const str = (v: unknown): string => {
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return str(v[0])
  if (v && typeof v === 'object' && 'value' in (v as Record<string, unknown>)) {
    return str((v as Record<string, unknown>).value)
  }
  return ''
}
const empty = (v: unknown): boolean => str(v) === '' && !(Array.isArray(v) && v.length > 0)
const num = (v: unknown): number | null => {
  const s = str(v)
  if (!s) return null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Фото-манифест коллекции: id записи → список ссылок. */
async function loadPhotoIds(cfg: CollectionConfig): Promise<Set<string>> {
  if (!cfg.photo) return new Set()
  const key = cfg.photo.manifestKey ?? '_manifest.json'
  const url = `${supabaseUrl()}/storage/v1/object/public/${cfg.photo.bucket}/${key}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return new Set()
    const json = await res.json() as Record<string, unknown>
    return new Set(Object.entries(json ?? {}).filter(([, v]) => Array.isArray(v) && v.length > 0).map(([k]) => k))
  } catch {
    return new Set()
  }
}

// --- правила ---------------------------------------------------------------

const COMPLEX_RULES: IssueRule[] = [
  { id: 'no-name', severity: 'critical', title: 'Нет названия',
    consequence: 'Страница комплекса отдаёт 404, и его нет в каталоге.',
    fix: 'Заполните «Название» — ровно так, как проект называет застройщик.' },
  { id: 'no-slug', severity: 'critical', title: 'Нет адреса страницы (слага)',
    consequence: 'Комплекс не появляется в каталоге и на него некуда сослаться.',
    fix: 'Откройте карточку и сохраните — слаг соберётся из названия. Либо впишите его вручную латиницей.' },
  { id: 'dup-slug', severity: 'critical', title: 'Слаг занят другой записью',
    consequence: 'По одному адресу может открыться только один комплекс — второй недостижим.',
    fix: 'Задайте одному из комплексов другой слаг: добавьте район или очередь — например, aquamarine-ii.' },
  { id: 'no-geo', severity: 'warning', title: 'Не указана геопозиция',
    consequence: 'На странице пропадает весь блок «Расположение»: карта, «как добраться», «что вокруг», погода и расстояние до пляжа.',
    fix: 'Вставьте ссылку из Google Maps в поле «Ссылка на локацию» и сохраните — координаты подставятся сами.' },
  { id: 'no-photos', severity: 'warning', title: 'Нет фотографий',
    consequence: 'В каталоге карточка без обложки, на странице нечего показать, при отправке ссылки не подтягивается картинка.',
    fix: 'Загрузите 5–15 кадров в блоке фотографий внизу карточки. Первое фото станет обложкой.' },
  { id: 'no-units', severity: 'warning', title: 'Ни одного опубликованного юнита',
    consequence: 'На странице пусто в блоке «Доступные юниты», а в каталоге не показывается цена «от».',
    fix: 'Заведите виллы или апартаменты в их таблицах, выберите там этот комплекс и поставьте галочку «Опубликовать».' },
  { id: 'no-developer', severity: 'warning', title: 'Не выбран застройщик',
    consequence: 'Комплекс не попадает на страницу застройщика и в его статистику.',
    fix: 'Выберите застройщика из списка в карточке — имя подставится само.' },
  { id: 'no-district', severity: 'warning', title: 'Не указан район',
    consequence: 'Комплекс выпадает из фильтра по району, из страницы района и из подборок на главной.',
    fix: 'Заполните «Район» латиницей — например, Ubud или Batu Bolong.' },
  { id: 'no-status', severity: 'warning', title: 'Не указан статус стройки',
    consequence: 'Комплекс не находится фильтром «Строится / Построен / Под заказ».',
    fix: 'Поставьте одно из трёх значений: Строится, Построен, Под заказ.' },
  { id: 'no-year', severity: 'warning', title: 'Не указан год сдачи',
    consequence: 'Комплекс не попадает в фильтр по году и в страницы «Сдано в 20XX», а готовность считается наугад.',
    fix: 'Впишите год четырьмя цифрами — для сданных объектов год фактической сдачи.' },
  { id: 'no-types', severity: 'warning', title: 'Не указаны типы юнитов',
    consequence: 'Комплекс не находится фильтром по типу и в заголовке страницы нет «виллы» или «апартаменты».',
    fix: 'Выберите один или несколько типов: Виллы, Апартаменты, Таунхаусы, Пентхаусы.' },
  { id: 'no-permit', severity: 'warning', title: 'Не указаны разрешительные документы',
    consequence: 'Пустует ключевой факт, по которому покупатель оценивает риск, и комплекс выпадает из фильтра по документам.',
    fix: 'Поставьте одно из пяти: нет, Заявка PBG, PBG, Заявка SLF, SLF.' },
  { id: 'seo-slug-mismatch', severity: 'warning', title: 'SEO:Slug не совпадает с адресом страницы',
    consequence: 'Ассистент и трекер рынка ищут комплекс по SEO:Slug и ведут на другой адрес.',
    fix: 'Просто сохраните карточку — SEO:Slug подтянется из слага автоматически.' },
  { id: 'not-published', severity: 'info', title: 'Не опубликован',
    consequence: 'Комплекс не показывается в интерактивных планах и не уходит в рассылки подписчикам. В каталоге он при этом виден.',
    fix: 'Поставьте галочку «Опубл.», когда карточка готова.' },
  { id: 'no-readiness', severity: 'info', title: 'Не заполнена готовность',
    consequence: 'Полоса готовности считается по году сдачи — выглядит правдоподобно, но это оценка, а не факт.',
    fix: 'Впишите готовность целым числом от 0 до 100.' },
]

const UNIT_RULES: IssueRule[] = [
  { id: 'no-name', severity: 'critical', title: 'Нет заголовка',
    consequence: 'Юнит не показывается ни в каталоге, ни на странице комплекса.',
    fix: 'Заполните «Название юнита» или сохраните карточку — заголовок соберётся сам.' },
  { id: 'no-slug', severity: 'critical', title: 'Нет адреса страницы (слага)',
    consequence: 'У юнита нет своей страницы, и он выпадает из списка на странице комплекса.',
    fix: 'Сохраните карточку — слаг соберётся из названия, комплекса и площади.' },
  { id: 'dup-slug', severity: 'critical', title: 'Слаг занят другой записью',
    consequence: 'По одному адресу открывается только один юнит — второй недостижим.',
    fix: 'Задайте одному из них свой слаг: добавьте номер юнита или количество спален.' },
  { id: 'no-complex', severity: 'warning', title: 'Не привязан к комплексу',
    consequence: 'Юнит не появится на странице своего ЖК и не попадёт в его цену «от».',
    fix: 'Выберите комплекс в поле «Комплекс» — из списка, а не текстом.' },
  { id: 'no-price', severity: 'warning', title: 'Нет цены',
    consequence: 'Карточка без цены проигрывает в выдаче и выпадает из фильтров по бюджету и из подборок.',
    fix: 'Впишите цену в долларах числом, без пробелов и знака доллара.' },
  { id: 'no-photos', severity: 'warning', title: 'Нет фотографий',
    consequence: 'Карточка без обложки почти не открывается из каталога.',
    fix: 'Загрузите фотографии в блоке внизу карточки.' },
  { id: 'no-geo', severity: 'warning', title: 'Не указана геопозиция',
    consequence: 'Юнит не показывается на карте каталога, и в нём нет блока окружения.',
    fix: 'Заполните Geo и Geo 2 — их можно скопировать из карточки комплекса.' },
  { id: 'no-area', severity: 'warning', title: 'Не указана площадь',
    consequence: 'Пропадает из заголовка, из фильтра по площади и из сравнения с рынком.',
    fix: 'Впишите площадь в квадратных метрах числом.' },
  { id: 'no-rooms', severity: 'warning', title: 'Не указано число спален',
    consequence: 'Юнит выпадает из фильтра по спальням — одного из самых частых.',
    fix: 'Впишите количество спален числом.' },
  { id: 'not-published', severity: 'info', title: 'Не опубликован',
    consequence: 'Юнита нет на сайте: ни в каталоге, ни на странице комплекса.',
    fix: 'Поставьте галочку «Опубликовать», когда карточка готова.' },
]

/** Коллекции, у которых есть вкладка «Проблемы». */
export function hasQualityReport(collectionKey: string): boolean {
  return collectionKey === 'complexes' || collectionKey === 'villas' || collectionKey === 'apartments'
}

// --- сканы -----------------------------------------------------------------

type Hit = { id: string; title: string; rules: string[] }

function markDuplicates(rows: { id: string; slug: string }[], hits: Map<string, Set<string>>): void {
  const bySlug = new Map<string, string[]>()
  for (const r of rows) {
    if (!r.slug) continue
    const list = bySlug.get(r.slug) ?? []
    list.push(r.id)
    bySlug.set(r.slug, list)
  }
  for (const ids of bySlug.values()) {
    if (ids.length < 2) continue
    for (const id of ids) hits.get(id)?.add('dup-slug')
  }
}

async function scanComplexes(cfg: CollectionConfig): Promise<{ hits: Hit[]; scanned: number }> {
  const sb = adminSb()
  const select = [
    'airtable_id, slug',
    'f_project:data->"Project"',
    'f_loc:data->"Location"',
    'f_loc2:data->"Location 2"',
    'f_dev:data->"Developer1"',
    'f_status:data->"Статус"',
    'f_year:data->"Year of completion"',
    'f_year_sp:data->"Year of completion "',
    'f_types:data->"Типы юнитов"',
    'f_permit:data->"Разрешительные документы"',
    'f_geo:data->"Geo"',
    'f_geo2:data->"Geo 2"',
    'f_pub:data->"Опубликовать"',
    'f_seoslug:data->"SEO:Slug"',
    'f_ready:data->"Готовность"',
  ].join(',')

  const [{ data, error }, photos, units] = await Promise.all([
    sb.from(cfg.table!).select(select).limit(1000),
    loadPhotoIds(cfg),
    loadUnitNames(),
  ])
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as Record<string, unknown>[]

  const hits = new Map<string, Set<string>>()
  const titles = new Map<string, string>()
  const slugRows: { id: string; slug: string }[] = []

  for (const r of rows) {
    const id = String(r.airtable_id)
    const name = str(r.f_project)
    const slug = str(r.slug)
    const found = new Set<string>()
    titles.set(id, name || slug || id)
    slugRows.push({ id, slug })

    if (!name) found.add('no-name')
    if (!slug) found.add('no-slug')
    if (empty(r.f_geo) || empty(r.f_geo2)) found.add('no-geo')
    if (!photos.has(id)) found.add('no-photos')
    if (empty(r.f_dev)) found.add('no-developer')
    if (empty(r.f_loc2) && empty(r.f_loc)) found.add('no-district')
    if (empty(r.f_status)) found.add('no-status')
    if (empty(r.f_year) && empty(r.f_year_sp)) found.add('no-year')
    if (empty(r.f_types)) found.add('no-types')
    if (empty(r.f_permit)) found.add('no-permit')
    if (slug && str(r.f_seoslug) !== slug) found.add('seo-slug-mismatch')
    if (r.f_pub !== true) found.add('not-published')
    if (num(r.f_ready) == null) found.add('no-readiness')
    // Юниты цепляются к ЖК вхождением его названия в заголовок или в поле
    // «Комплекс 1» — той же логикой, что и страница комплекса.
    if (name && name.length >= 3) {
      const needle = name.toLowerCase()
      if (!units.some(u => u.includes(needle))) found.add('no-units')
    }
    hits.set(id, found)
  }
  markDuplicates(slugRows, hits)

  return {
    scanned: rows.length,
    hits: [...hits.entries()]
      .filter(([, rules]) => rules.size > 0)
      .map(([id, rules]) => ({ id, title: titles.get(id) ?? id, rules: [...rules] })),
  }
}

/** Заголовки опубликованных юнитов в нижнем регистре — по ним проверяется,
 *  есть ли у комплекса хоть что-то на продажу. */
async function loadUnitNames(): Promise<string[]> {
  const sb = adminSb()
  const select = 'title:data->"SEO:Title", link:data->"Комплекс 1", pub:data->"Опубликовать"'
  const [villas, apts] = await Promise.all([
    sb.from('raw_villas').select(select).limit(3000),
    sb.from('raw_apartments').select(select).limit(3000),
  ])
  const out: string[] = []
  for (const batch of [villas.data, apts.data]) {
    for (const r of (batch ?? []) as unknown as Record<string, unknown>[]) {
      if (r.pub !== true) continue
      const s = `${str(r.title)} ${str(r.link)}`.toLowerCase().trim()
      if (s) out.push(s)
    }
  }
  return out
}

async function scanUnits(cfg: CollectionConfig): Promise<{ hits: Hit[]; scanned: number }> {
  const sb = adminSb()
  const districtKey = cfg.key === 'villas' ? 'Location 2' : 'Location filter'
  const select = [
    'airtable_id',
    'f_title:data->"SEO:Title"',
    'f_slug:data->"SEO:Slug"',
    'f_complex:data->"Комплекс"',
    'f_complex_name:data->"Комплекс 1"',
    'f_price:data->price_usd',
    'f_price2:data->price',
    'f_price3:data->"Цена"',
    'f_geo:data->"Geo"',
    'f_geo2:data->"Geo 2"',
    'f_area:data->"Площадь"',
    'f_rooms:data->"Комнаты"',
    'f_pub:data->"Опубликовать"',
    `f_district:data->"${districtKey}"`,
    'f_district_alt:data->"Location"',
  ].join(',')

  const [{ data, error }, photos] = await Promise.all([
    sb.from(cfg.table!).select(select).limit(3000),
    loadPhotoIds(cfg),
  ])
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as Record<string, unknown>[]

  const hits = new Map<string, Set<string>>()
  const titles = new Map<string, string>()
  const slugRows: { id: string; slug: string }[] = []

  for (const r of rows) {
    const id = String(r.airtable_id)
    const title = str(r.f_title)
    const slug = str(r.f_slug)
    const found = new Set<string>()
    titles.set(id, title || slug || id)
    slugRows.push({ id, slug })

    if (!title) found.add('no-name')
    if (!slug || slug.startsWith('-')) found.add('no-slug')
    if (empty(r.f_complex) && empty(r.f_complex_name)) found.add('no-complex')
    if (num(r.f_price) == null && num(r.f_price2) == null && num(r.f_price3) == null) found.add('no-price')
    if (!photos.has(id)) found.add('no-photos')
    if (empty(r.f_geo) || empty(r.f_geo2)) found.add('no-geo')
    if (num(r.f_area) == null) found.add('no-area')
    if (num(r.f_rooms) == null) found.add('no-rooms')
    if (r.f_pub !== true) found.add('not-published')
    hits.set(id, found)
  }
  markDuplicates(slugRows, hits)

  return {
    scanned: rows.length,
    hits: [...hits.entries()]
      .filter(([, rules]) => rules.size > 0)
      .map(([id, rules]) => ({ id, title: titles.get(id) ?? id, rules: [...rules] })),
  }
}

// --- сборка отчёта ---------------------------------------------------------

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }

function buildReport(cfg: CollectionConfig, rules: IssueRule[], scan: { hits: Hit[]; scanned: number }): IssueReport {
  const byId = new Map(rules.map(r => [r.id, r]))
  const byRule = new Map<string, IssueRecord[]>()
  const counts: Record<Severity, number> = { critical: 0, warning: 0, info: 0 }

  for (const hit of scan.hits) {
    // Порядок правил внутри записи — тот же, что у списка правил: сначала то,
    // из-за чего объекта фактически нет.
    const ordered = rules.filter(r => hit.rules.includes(r.id)).map(r => r.id)
    const record: IssueRecord = { id: hit.id, title: hit.title, rules: ordered }
    for (const ruleId of ordered) {
      const list = byRule.get(ruleId) ?? []
      list.push(record)
      byRule.set(ruleId, list)
    }
    const worst = ordered.map(id => byId.get(id)!.severity)
      .sort((a, b) => SEVERITY_ORDER[a] - SEVERITY_ORDER[b])[0]
    if (worst) counts[worst]++
  }

  const firedRules = rules
    .filter(r => (byRule.get(r.id)?.length ?? 0) > 0)
    .map(r => ({ ...r, count: byRule.get(r.id)!.length, records: byRule.get(r.id)! }))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.count - a.count)

  const records = scan.hits
    .map(h => ({ id: h.id, title: h.title, rules: rules.filter(r => h.rules.includes(r.id)).map(r => r.id) }))
    .sort((a, b) => {
      const sa = SEVERITY_ORDER[byId.get(a.rules[0])?.severity ?? 'info']
      const sb2 = SEVERITY_ORDER[byId.get(b.rules[0])?.severity ?? 'info']
      return sa - sb2 || b.rules.length - a.rules.length || a.title.localeCompare(b.title, 'ru')
    })

  return { collection: cfg.key, scanned: scan.scanned, rules: firedRules, records, counts }
}

async function runScan(cfg: CollectionConfig): Promise<IssueReport> {
  if (cfg.key === 'complexes') return buildReport(cfg, COMPLEX_RULES, await scanComplexes(cfg))
  return buildReport(cfg, UNIT_RULES, await scanUnits(cfg))
}

/**
 * Отчёт по коллекции. Кэш сбрасывается тем же тегом, что и публичные страницы,
 * — то есть любой правкой в админке; 60 секунд — потолок для правки, сделанной
 * в обход админки.
 */
export async function loadQualityReport(cfg: CollectionConfig): Promise<IssueReport> {
  if (!hasQualityReport(cfg.key)) {
    return { collection: cfg.key, scanned: 0, rules: [], records: [], counts: { critical: 0, warning: 0, info: 0 } }
  }
  const tag = cfg.revalidateKind ? KIND_TO_TAGS[cfg.revalidateKind] : undefined
  const cached = unstable_cache(
    () => runScan(cfg),
    [`admin-quality-${cfg.key}-v1`],
    { revalidate: 60, tags: tag ? [tag] : undefined },
  )
  try {
    return await cached()
  } catch (e) {
    return {
      collection: cfg.key, scanned: 0, rules: [], records: [],
      counts: { critical: 0, warning: 0, info: 0 },
      error: e instanceof Error ? e.message : 'scan_failed',
    }
  }
}
