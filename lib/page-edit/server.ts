import 'server-only'
import { getCollection } from '@/lib/admin/collections'
import { adapterFor } from '@/lib/admin/adapters'
import { adminSb } from '@/lib/admin/sb'
import { revalidateCollection } from '@/lib/admin/revalidate'
import { areaSyncPatch } from '@/lib/admin/area-sync'
import { priceSyncPatch } from '@/lib/admin/price-sync'
import { unitCreateDefaults } from '@/lib/admin/unit-defaults'
import { withComplexDescription } from '@/lib/admin/complex-description'
import { propagateComplexGeo } from '@/lib/admin/complex-geo-sync'
import { getPhotos, setPhotos, uploadToBucket } from '@/lib/admin/photos'
import { cdnBucketBase } from '@/lib/photo-cdn'
import { inputToPercent, percentToInput } from '@/lib/admin/fields'
import type { CollectionConfig } from '@/lib/admin/adapters/types'
import { DEVELOPER_DESCRIPTION_FIELD } from '@/lib/developer-description'
import { sendAdminAlert } from '@/lib/admin-alert'
import { COLLECTION_OF, KIND_LABEL, fieldsFor, type EditField, type EditKind } from './schema'
import { mapsUrl } from './geo'
import type { Editor } from './access'

// Чтение и запись человеческой формы правки страницы.
//
// В отличие от /api/admin/data здесь:
//   • пишутся только поля из lib/page-edit/schema.ts (белый список по роли);
//   • значения приходят в «человеческом» виде (проценты 0–100, пункты списком,
//     точка карты объектом) и переводятся в формат базы здесь;
//   • нет ИИ-автозаполнения — сохранение формы ничего не стоит.

export class EditError extends Error {
  constructor(public code: string, public status = 400) { super(code) }
}

const str = (v: unknown): string => {
  if (Array.isArray(v)) return str(v[0])
  if (v && typeof v === 'object' && 'value' in (v as Record<string, unknown>)) return str((v as { value: unknown }).value)
  return v == null ? '' : String(v).trim()
}

export type EditValue = string | number | boolean | string[] | { lat: number; lng: number } | null

export type EditChild = {
  kind: EditKind
  id: string
  title: string
  subtitle: string
  published: boolean
}

export type EditPayload = {
  kind: EditKind
  id: string
  title: string
  role: Editor['role']
  values: Record<string, EditValue>
  photos: string[] | null
  /** Для юнита: из какого ЖК он, и берёт ли точку оттуда. */
  complex: { id: string; name: string } | null
  children: EditChild[]
}

function cfgOf(kind: EditKind): CollectionConfig {
  const cfg = getCollection(COLLECTION_OF[kind])
  if (!cfg) throw new EditError('unknown_kind', 404)
  return cfg
}

// --- чтение -----------------------------------------------------------------

function readValue(f: EditField, d: Record<string, unknown>): EditValue {
  const raw = (f.readFrom ?? [f.key]).map(k => d[k]).find(v => str(v) !== '') ?? d[f.key]
  switch (f.input) {
    case 'map': {
      const lat = Number(str(d['Geo'])), lng = Number(str(d['Geo 2']))
      return Number.isFinite(lat) && Number.isFinite(lng) && str(d['Geo']) && str(d['Geo 2']) ? { lat, lng } : null
    }
    case 'toggle': return f.trueValue ? str(raw) === f.trueValue : raw === true
    case 'percent': { const s = percentToInput(raw); return s === '' ? null : Number(s) }
    case 'number':
    case 'money': {
      const n = Number(str(raw).replace(/[^\d.-]/g, ''))
      return str(raw) !== '' && Number.isFinite(n) ? n : null
    }
    case 'chips':
      return Array.isArray(raw) ? raw.map(str).filter(Boolean) : str(raw) ? str(raw).split(',').map(s => s.trim()).filter(Boolean) : []
    case 'list':
      return str(raw).split('\n').map(s => s.replace(/^\s*[•\-–—*]\s*/, '').trim()).filter(Boolean)
    default:
      return str(raw)
  }
}

/** Текст «О застройщике», который сейчас на сайте (тот же порядок, что на странице). */
async function currentDeveloperText(d: Record<string, unknown>, id: string): Promise<string> {
  const { data } = await adminSb()
    .from('assistant_kb').select('page_body').eq('kind', 'developer').eq('ref_id', id).maybeSingle()
  return str((data as { page_body?: unknown } | null)?.page_body)
    || str(d['SEO Text']) || str(d['Описание ИИ']) || str(d['AI Описание'])
}

async function childrenOf(kind: EditKind, id: string, d: Record<string, unknown>): Promise<EditChild[]> {
  const sb = adminSb()
  if (kind === 'developer') {
    const name = str(d['Developer'])
    if (!name) return []
    const { data, error } = await sb
      .from('raw_complexes')
      .select('airtable_id, data->Project, data->"Статус", data->"Опубликовать", data->"Location 2", data->Developer1, data->Developer')
      .or(`data->>Developer1.ilike.${pgLike(name)},data->>Developer.ilike.${pgLike(name)}`)
      .limit(100)
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(r => ({
      kind: 'complex' as const,
      id: String(r.airtable_id),
      title: str(r.Project) || 'Без названия',
      subtitle: [str(r['Location 2']), str(r['Статус'])].filter(Boolean).join(' · '),
      published: r['Опубликовать'] === true,
    })).sort((a, b) => a.title.localeCompare(b.title))
  }
  if (kind === 'complex') {
    const name = str(d['Project'])
    const out: EditChild[] = []
    for (const [unitKind, table, priceKey] of [['villa', 'raw_villas', 'price'], ['apartment', 'raw_apartments', 'price_usd']] as const) {
      const select = `airtable_id, title:data->"SEO:Title", price:data->${priceKey}, rooms:data->"Комнаты", area:data->"Площадь", pub:data->"Опубликовать"`
      const [byId, byName] = await Promise.all([
        sb.from(table).select(select).contains('data', { 'Комплекс': [id] }).limit(300),
        name.length >= 3
          ? sb.from(table).select(select).ilike('data->>"Комплекс 1"', name.replace(/[%_\\]/g, '\\$&')).limit(300)
          : Promise.resolve({ data: [], error: null }),
      ])
      if (byId.error) throw new Error(byId.error.message)
      const seen = new Set<string>()
      for (const r of [...(byId.data ?? []), ...(byName.data ?? [])] as unknown as Record<string, unknown>[]) {
        const rid = String(r.airtable_id)
        if (seen.has(rid)) continue
        seen.add(rid)
        const price = Number(str(r.price))
        out.push({
          kind: unitKind,
          id: rid,
          title: str(r.title).replace(/\s*\|\s*Balinsky\s*$/i, '') || (unitKind === 'villa' ? 'Вилла' : 'Апартаменты'),
          subtitle: [
            Number.isFinite(price) && price > 0 ? `$${price.toLocaleString('ru-RU')}` : '',
            str(r.rooms) ? `${str(r.rooms)} сп.` : '',
            str(r.area) ? `${str(r.area)} м²` : '',
          ].filter(Boolean).join(' · '),
          published: r.pub === true,
        })
      }
    }
    return out
  }
  return []
}

/** Экранирование значения для фильтра PostgREST `or=(...)`. */
function pgLike(v: string): string {
  return `"${v.replace(/["\\]/g, '\\$&')}"`
}

export async function loadEdit(kind: EditKind, id: string, editor: Editor): Promise<EditPayload> {
  const cfg = cfgOf(kind)
  let row = await adapterFor(cfg).get(cfg, id)
  if (!row) throw new EditError('not_found', 404)
  if (kind === 'complex') row = await withComplexDescription(cfg, row)
  const d = row.fields

  const values: Record<string, EditValue> = {}
  for (const f of fieldsFor(kind, editor.role)) values[f.key] = readValue(f, d)
  if (kind === 'developer' && !str(values[DEVELOPER_DESCRIPTION_FIELD])) {
    values[DEVELOPER_DESCRIPTION_FIELD] = await currentDeveloperText(d, id).catch(() => '')
  }

  let complex: EditPayload['complex'] = null
  if (kind === 'villa' || kind === 'apartment') {
    const cid = Array.isArray(d['Комплекс']) ? str(d['Комплекс']) : ''
    complex = cid ? { id: cid, name: str(d['Комплекс 1']) || 'ЖК' } : null
  }

  return {
    kind, id,
    title: str(d[cfg.titleField]).replace(/\s*\|\s*Balinsky\s*$/i, ''),
    role: editor.role,
    values,
    photos: cfg.photo ? await getPhotos(cfg, id) : null,
    complex,
    children: await childrenOf(kind, id, d),
  }
}

// --- запись -----------------------------------------------------------------

/** Правку застройщика видит владелец: короткое сообщение в Telegram. */
function notifyDeveloperEdit(editor: Editor, what: string): void {
  if (editor.role !== 'developer') return
  void sendAdminAlert(`✏️ ${editor.developerName || 'Застройщик'} поправил страницу\n${what}`)
}

function recordTitle(kind: EditKind, fields: Record<string, unknown>): string {
  const cfg = getCollection(COLLECTION_OF[kind])
  const t = cfg ? str(fields[cfg.titleField]).replace(/\s*\|\s*Balinsky\s*$/i, '') : ''
  return `${KIND_LABEL[kind]}${t ? ` «${t}»` : ''}`
}

function describeValue(f: EditField, v: unknown): string {
  if (f.input === 'map') return v ? 'новая точка на карте' : 'точка убрана'
  if (f.input === 'toggle') return v ? 'да' : 'нет'
  if (Array.isArray(v)) return v.length ? `${v.length} пункт.` : 'пусто'
  const s = str(v)
  return s ? (s.length > 60 ? `${s.slice(0, 60)}…` : s) : 'пусто'
}

const MAX_TEXT = 300
const MAPS_LINK = /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)\//i
const MAX_LONG = 20_000

function toStore(f: EditField, v: unknown): Record<string, unknown> {
  const put = (val: unknown): Record<string, unknown> => {
    const out: Record<string, unknown> = { [f.key]: val }
    for (const k of f.alsoWrite ?? []) out[k] = val
    return out
  }
  switch (f.input) {
    case 'map': {
      if (v == null) return { Geo: '', 'Geo 2': '' }
      const p = v as { lat?: unknown; lng?: unknown; link?: unknown }
      const lat = Number(p.lat), lng = Number(p.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -9.2 || lat > -7.9 || lng < 114.3 || lng > 116.1) {
        throw new EditError('bad_point')
      }
      // 6 знаков — ~10 см, точнее ссылка Google всё равно не даёт.
      const point = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }
      const link = str(p.link)
      const ownLink = link.length < 2000 && MAPS_LINK.test(link) ? link : mapsUrl(point)
      return { Geo: String(point.lat), 'Geo 2': String(point.lng), 'Link from Google maps on location': ownLink }
    }
    case 'toggle':
      if (typeof v !== 'boolean') throw new EditError('bad_value')
      return put(f.trueValue ? (v ? f.trueValue : '') : v)
    case 'percent':
      return put(v == null || v === '' ? null : inputToPercent(String(v)))
    case 'number':
    case 'money': {
      if (v == null || v === '') return put(null)
      const n = Number(v)
      if (!Number.isFinite(n) || n < 0 || n > 1e10) throw new EditError('bad_number')
      return put(n)
    }
    case 'chips': {
      if (!Array.isArray(v)) throw new EditError('bad_value')
      return put(v.map(str).filter(Boolean).slice(0, 20).map(s => s.slice(0, MAX_TEXT)))
    }
    case 'list': {
      if (!Array.isArray(v)) throw new EditError('bad_value')
      const text = v.map(str).filter(Boolean).join('\n')
      if (text.length > MAX_LONG) throw new EditError('too_long')
      return put(text)
    }
    case 'image': {
      const s = str(v)
      if (s && !/^https:\/\//.test(s)) throw new EditError('bad_url')
      return put(s)
    }
    case 'textarea': {
      const s = typeof v === 'string' ? v.trim() : ''
      if (s.length > MAX_LONG) throw new EditError('too_long')
      return put(s)
    }
    default: {
      const s = str(v)
      if (s.length > MAX_TEXT) throw new EditError('too_long')
      return put(s)
    }
  }
}

/** Человеческие значения → патч базы. Ключи вне белого списка роли — ошибка. */
function buildPatch(kind: EditKind, editor: Editor, values: Record<string, unknown>): Record<string, unknown> {
  const allowed = new Map(fieldsFor(kind, editor.role).map(f => [f.key, f]))
  const patch: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(values)) {
    const f = allowed.get(key)
    if (!f) throw new EditError(`field_not_allowed:${key}`, 403)
    Object.assign(patch, toStore(f, v))
  }
  return patch
}

export async function saveEdit(kind: EditKind, id: string, editor: Editor, values: Record<string, unknown>): Promise<void> {
  const cfg = cfgOf(kind)
  const adapter = adapterFor(cfg)
  const current = await adapter.get(cfg, id)
  if (!current) throw new EditError('not_found', 404)
  const patch = buildPatch(kind, editor, values)
  if (Object.keys(patch).length === 0) return
  // Площадь и цена хранятся в нескольких местах (заголовок, три поля цены) —
  // те же синхронизации, что у админки.
  const areaPatch = areaSyncPatch(cfg, current.fields, patch)
  const pricePatch = priceSyncPatch(cfg, current.fields, { ...patch, ...areaPatch })
  const full = { ...patch, ...areaPatch, ...pricePatch }
  await adapter.update(cfg, id, full)
  await revalidateCollection(cfg, id)
  const labels = new Map(fieldsFor(kind, editor.role).map(f => [f.key, f]))
  notifyDeveloperEdit(editor, `${recordTitle(kind, current.fields)}\n` + Object.entries(values)
    .map(([k, v]) => `• ${labels.get(k)?.label ?? k}: ${describeValue(labels.get(k)!, v)}`).join('\n'))
  if (kind === 'complex' && 'Geo' in full) {
    await propagateComplexGeo(id,
      { lat: current.fields['Geo'], lng: current.fields['Geo 2'] },
      { lat: full['Geo'], lng: full['Geo 2'] })
  }
}

/** Новый юнит в ЖК. Район, статус, точку и условия юнит берёт от ЖК. */
export async function createUnit(
  complexId: string,
  kind: 'villa' | 'apartment',
  editor: Editor,
  values: Record<string, unknown>,
): Promise<string> {
  const cfg = cfgOf(kind)
  const { data: cx } = await adminSb().from('raw_complexes').select('data').eq('airtable_id', complexId).maybeSingle()
  const cd = (cx as { data?: Record<string, unknown> } | null)?.data
  if (!cd) throw new EditError('complex_not_found', 404)

  const devName = str(cd['Developer1']) || str(cd['Developer'])
  let devId = ''
  if (devName) {
    const { data: dev } = await adminSb().from('raw_developers').select('airtable_id')
      .ilike('data->>Developer', devName).limit(1).maybeSingle()
    devId = str((dev as { airtable_id?: string } | null)?.airtable_id)
  }

  const fields: Record<string, unknown> = {
    ...buildPatch(kind, editor, values),
    'Комплекс': [complexId],
    'Комплекс 1': str(cd['Project']),
    ...(devId ? { Developer: [devId] } : {}),
  }
  if (!('Опубликовать' in fields)) fields['Опубликовать'] = false
  const seeded = { ...fields, ...(await unitCreateDefaults(cfg, fields)) }
  const withPrice = { ...seeded, ...priceSyncPatch(cfg, {}, seeded) }
  const row = await adapterFor(cfg).create(cfg, withPrice)
  await revalidateCollection(cfg, row.id)
  notifyDeveloperEdit(editor, `Добавил: ${recordTitle(kind, withPrice)}`)
  return row.id
}

// --- фото -------------------------------------------------------------------

const MAX_PHOTO_BYTES = 15 * 1024 * 1024
const MAX_PHOTOS = 60

/** Фото только из нашего хранилища: застройщик не должен подсунуть чужую ссылку. */
function ownPhotoUrl(cfg: CollectionConfig, url: string): boolean {
  const bucket = cfg.photo?.bucket
  if (!bucket) return false
  const supa = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')
  const prefixes = [cdnBucketBase(bucket), supa && `${supa}/storage/v1/object/public/${bucket}`]
    .filter(Boolean).map(p => `${p}/`)
  return prefixes.some(p => url.startsWith(p))
}

export async function savePhotos(kind: EditKind, id: string, editor: Editor, urls: unknown): Promise<void> {
  const cfg = cfgOf(kind)
  if (!cfg.photo) throw new EditError('no_photos')
  if (!Array.isArray(urls) || urls.length > MAX_PHOTOS) throw new EditError('bad_photos')
  const list = urls.map(str)
  const current = new Set(await getPhotos(cfg, id))
  // Свои уже стоящие фото оставлять можно всегда; новые — только из нашего хранилища.
  if (editor.role !== 'staff' && list.some(u => !current.has(u) && !ownPhotoUrl(cfg, u))) {
    throw new EditError('foreign_photo', 403)
  }
  await setPhotos(cfg, id, list)
  await revalidateCollection(cfg, id)
  if (editor.role === 'developer') {
    const row = await adapterFor(cfg).get(cfg, id).catch(() => null)
    const added = list.filter(u => !current.has(u)).length
    const removed = [...current].filter(u => !list.includes(u)).length
    notifyDeveloperEdit(editor, `${recordTitle(kind, row?.fields ?? {})}\nФото: ${added ? `+${added}` : ''}${added && removed ? ', ' : ''}${removed ? `−${removed}` : ''}${!added && !removed ? 'порядок' : ''}`)
  }
}

export async function uploadImage(kind: EditKind, editor: Editor, file: File): Promise<string> {
  const cfg = cfgOf(kind)
  const bucket = cfg.photo?.bucket ?? cfg.uploadBucket
  if (!bucket) throw new EditError('no_bucket')
  // SVG может нести скрипт — его грузит только команда (логотипы).
  const types = editor.role === 'staff' ? /^image\/(jpeg|png|webp|avif|heic|heif|gif|svg\+xml)$/ : /^image\/(jpeg|png|webp|avif|heic|heif)$/
  if (!types.test(file.type)) throw new EditError('not_an_image')
  if (file.size > MAX_PHOTO_BYTES) throw new EditError('too_big')
  const buf = Buffer.from(await file.arrayBuffer())
  const prefix = editor.role === 'staff' ? 'admin' : `dev/${editor.developerId ?? 'unknown'}`
  return uploadToBucket(bucket, { filename: file.name, buf, contentType: file.type, prefix })
}
