// Server-side data layer for the interactive ЖК visualisation MVP.
//
// Three concerns split per function:
//   - Layers: tree of photos drilled-down per complex (root → child).
//   - Hotspots: clickable polygons within a layer, each pointing at
//     the next layer or directly at a catalogue unit.
//   - Units list: candidate villas / apartments inside a complex,
//     used by the admin editor's target-picker dropdown.

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const VIZ_BUCKET = 'viz-photos'
const PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${VIZ_BUCKET}`

// Public types used by the admin pages and the public viewer.
export type Layer = {
  id: number
  complexAirtableId: string
  parentLayerId: number | null
  title: string | null
  photoUrl: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type HotspotAvailability = 'free' | 'reserved' | 'sold' | null

export type Hotspot = {
  id: number
  layerId: number
  label: string | null
  polygon: [number, number][]   // normalized 0..1
  targetType: 'layer' | 'unit'
  targetLayerId: number | null
  targetUnitKind: 'villa' | 'apartment' | null
  targetUnitSlug: string | null
  availability: HotspotAvailability
  sortOrder: number
}

export type ComplexSummary = {
  airtableId: string
  slug: string
  name: string
  developer: string | null
  district: string | null
  layerCount: number
  hotspotCount: number
}

export type UnitOption = {
  kind: 'villa' | 'apartment'
  slug: string
  title: string
  bedrooms: number | null
  area: number | null
  priceUsd: number | null
  photoUrl: string | null
}

// === migration-status ====================================================
// True when the latest call to listLayers / listHotspots / etc. found
// the visualisation tables missing (Postgres 42P01 / PostgREST PGRST205).
// The admin page reads it and renders a "apply migration 019" banner
// so the empty editor isn't a mystery.
let _tablesMissing = false
export function isVizTablesMissing(): boolean { return _tablesMissing }

function isMissingTableError(e: { code?: string; message?: string } | null | undefined): boolean {
  if (!e) return false
  return e.code === '42P01' || e.code === 'PGRST205' || e.code === 'PGRST204'
    || /could not find the table/i.test(e.message ?? '')
    || /relation .* does not exist/i.test(e.message ?? '')
    || /schema cache/i.test(e.message ?? '')
}

// === layers CRUD =========================================================

export async function listLayers(complexAirtableId: string): Promise<Layer[]> {
  const { data, error } = await sb
    .from('complex_visualization_layers')
    .select('*')
    .eq('complex_airtable_id', complexAirtableId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
  if (error) {
    if (isMissingTableError(error)) { _tablesMissing = true; return [] }
    throw error
  }
  _tablesMissing = false
  return (data ?? []).map(rowToLayer)
}

export async function createLayer(input: {
  complexAirtableId: string
  parentLayerId: number | null
  title: string | null
  photoUrl: string
}): Promise<Layer> {
  const { data, error } = await sb
    .from('complex_visualization_layers')
    .insert({
      complex_airtable_id: input.complexAirtableId,
      parent_layer_id: input.parentLayerId,
      title: input.title,
      photo_url: input.photoUrl,
    })
    .select('*')
    .single()
  if (error || !data) throw error ?? new Error('layer_insert_failed')
  return rowToLayer(data)
}

export async function updateLayer(id: number, patch: Partial<Pick<Layer, 'title' | 'photoUrl' | 'sortOrder'>>): Promise<void> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.title !== undefined) update.title = patch.title
  if (patch.photoUrl !== undefined) update.photo_url = patch.photoUrl
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder
  const { error } = await sb.from('complex_visualization_layers').update(update).eq('id', id)
  if (error) throw error
}

export async function deleteLayer(id: number): Promise<void> {
  // Cascade drops hotspots + child layers via the FK on delete cascade.
  const { error } = await sb.from('complex_visualization_layers').delete().eq('id', id)
  if (error) throw error
}

// === hotspots CRUD =======================================================

export async function listHotspots(layerIds: number[]): Promise<Hotspot[]> {
  if (layerIds.length === 0) return []
  const { data, error } = await sb
    .from('complex_visualization_hotspots')
    .select('*')
    .in('layer_id', layerIds)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
  if (error) {
    if (isMissingTableError(error)) { _tablesMissing = true; return [] }
    throw error
  }
  return (data ?? []).map(rowToHotspot)
}

export async function createHotspot(input: Omit<Hotspot, 'id' | 'sortOrder' | 'availability'> & { sortOrder?: number; availability?: HotspotAvailability }): Promise<Hotspot> {
  const { data, error } = await sb
    .from('complex_visualization_hotspots')
    .insert({
      layer_id: input.layerId,
      label: input.label,
      polygon: input.polygon,
      target_type: input.targetType,
      target_layer_id: input.targetLayerId,
      target_unit_kind: input.targetUnitKind,
      target_unit_slug: input.targetUnitSlug,
      availability: input.availability ?? null,
      sort_order: input.sortOrder ?? 0,
    })
    .select('*')
    .single()
  if (error || !data) throw error ?? new Error('hotspot_insert_failed')
  return rowToHotspot(data)
}

export async function updateHotspot(id: number, patch: Partial<Omit<Hotspot, 'id' | 'layerId'>>): Promise<void> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.label !== undefined) update.label = patch.label
  if (patch.polygon !== undefined) update.polygon = patch.polygon
  if (patch.targetType !== undefined) update.target_type = patch.targetType
  if (patch.targetLayerId !== undefined) update.target_layer_id = patch.targetLayerId
  if (patch.targetUnitKind !== undefined) update.target_unit_kind = patch.targetUnitKind
  if (patch.targetUnitSlug !== undefined) update.target_unit_slug = patch.targetUnitSlug
  if (patch.availability !== undefined) update.availability = patch.availability
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder
  const { error } = await sb.from('complex_visualization_hotspots').update(update).eq('id', id)
  if (error) throw error
}

export async function deleteHotspot(id: number): Promise<void> {
  const { error } = await sb.from('complex_visualization_hotspots').delete().eq('id', id)
  if (error) throw error
}

// === photo upload ========================================================

export async function uploadVizPhoto(opts: {
  complexAirtableId: string
  filename: string
  buf: Buffer
  contentType: string
}): Promise<string | null> {
  const safeName = opts.filename.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80) || 'photo'
  const key = `${opts.complexAirtableId}/${Date.now()}-${safeName}`
  const { error } = await sb.storage.from(VIZ_BUCKET).upload(key, opts.buf, {
    contentType: opts.contentType,
    upsert: false,
    cacheControl: '604800',
  })
  if (error) {
    console.error('[viz] upload', key, error.message)
    return null
  }
  return `${PUBLIC_BASE}/${key}`
}

// === complexes index for /admin/visualizations =============================

// Walk raw_complexes once + all layers + all hotspots, return per-complex
// summary so admin sees "12 visualised, 174 not started" at a glance.
export async function listComplexesWithStatus(): Promise<ComplexSummary[]> {
  // Pull raw_complexes in pages because Supabase JS defaults to a
  // 1000-row cap regardless of the .limit() value when the table
  // has no service-role override on the request — this matches how
  // the public catalog page paginates the same table.
  const complexes: { airtable_id: string; data: Record<string, unknown> }[] = []
  for (let from = 0; from < 2000; from += 200) {
    const { data, error } = await sb.from('raw_complexes')
      .select('airtable_id, data')
      .range(from, from + 199)
    if (error) { console.error('[viz] raw_complexes load failed:', error.message); break }
    if (!data || data.length === 0) break
    complexes.push(...(data as { airtable_id: string; data: Record<string, unknown> }[]))
    if (data.length < 200) break
  }

  const [layersRes, hotspotsRes] = await Promise.all([
    sb.from('complex_visualization_layers').select('id, complex_airtable_id'),
    sb.from('complex_visualization_hotspots').select('id, layer_id'),
  ])
  // Tolerate the migration-not-applied case so the index page still
  // renders the complete complex list (just with all rows in the
  // "no visualisation" bucket). The page reads isVizTablesMissing()
  // to render an explanatory banner.
  if (layersRes.error) {
    if (isMissingTableError(layersRes.error)) _tablesMissing = true
    else console.error('[viz] layers load failed:', layersRes.error.message)
  } else {
    _tablesMissing = false
  }
  if (hotspotsRes.error && !isMissingTableError(hotspotsRes.error)) {
    console.error('[viz] hotspots load failed:', hotspotsRes.error.message)
  }
  const layerRows = (layersRes.data ?? []) as { id: number; complex_airtable_id: string }[]
  const hotspotRows = (hotspotsRes.data ?? []) as { layer_id: number }[]

  const layerCount = new Map<string, number>()
  const layerToComplex = new Map<number, string>()
  for (const l of layerRows) {
    layerCount.set(l.complex_airtable_id, (layerCount.get(l.complex_airtable_id) ?? 0) + 1)
    layerToComplex.set(l.id, l.complex_airtable_id)
  }
  const hotspotCount = new Map<string, number>()
  for (const h of hotspotRows) {
    const cid = layerToComplex.get(h.layer_id)
    if (!cid) continue
    hotspotCount.set(cid, (hotspotCount.get(cid) ?? 0) + 1)
  }

  // Note: raw_complexes has no Публикация checkbox — every row in
  // the table is considered live (matches what the public catalog
  // does). We filter only on having a usable slug.
  return complexes
    .map(c => {
      const slug = pickStr(c.data['SEO:Slug']) ?? ''
      const name = pickStr(c.data['Project']) ?? slug
      const developer = pickStr(c.data['Developer1']) ?? pickStr(c.data['Варианты поиска застройщика'])
      const district = pickStr(c.data['Location 2']) ?? pickStr(c.data['Location'])
      return {
        airtableId: c.airtable_id,
        slug,
        name,
        developer,
        district,
        layerCount: layerCount.get(c.airtable_id) ?? 0,
        hotspotCount: hotspotCount.get(c.airtable_id) ?? 0,
      }
    })
    .filter(c => c.slug)
    .sort((a, b) => {
      // Visualised complexes first, then alphabetic.
      const aHas = a.layerCount > 0 ? 1 : 0
      const bHas = b.layerCount > 0 ? 1 : 0
      if (aHas !== bHas) return bHas - aHas
      return a.name.localeCompare(b.name, 'ru')
    })
}

// === units inside one complex (for the hotspot target picker) ============

// Returns villas + apartments whose SEO:Title contains the complex name —
// matches the same heuristic the public complex page uses for its units
// list, so the admin sees the same set when binding hotspots.
export async function listUnitsForComplex(complexAirtableId: string): Promise<UnitOption[]> {
  const { data: complexRow } = await sb
    .from('raw_complexes')
    .select('data')
    .eq('airtable_id', complexAirtableId)
    .maybeSingle()
  const name = pickStr((complexRow?.data as Record<string, unknown> | undefined)?.['Project'])
  if (!name || name.length < 3) return []
  const lower = name.toLowerCase()

  const [villaRes, aptRes] = await Promise.all([
    sb.from('raw_villas').select('airtable_id, data').limit(2000),
    sb.from('raw_apartments').select('airtable_id, data').limit(2000),
  ])
  const out: UnitOption[] = []

  type RawRow = { airtable_id: string; data: Record<string, unknown> }
  for (const r of (villaRes.data ?? []) as RawRow[]) {
    if (r.data['Опубликовать'] !== true) continue
    const title = pickStr(r.data['SEO:Title'])
    if (!title || !title.toLowerCase().includes(lower)) continue
    const slug = pickStr(r.data['SEO:Slug'])
    if (!slug || slug.startsWith('-')) continue
    out.push({
      kind: 'villa',
      slug,
      title: title.replace(/\s*\|\s*Balinsky\s*$/, '').trim(),
      bedrooms: pickNum(r.data['Комнаты']) ?? pickNum(r.data['Спальни']),
      area: pickNum(r.data['Площадь']),
      priceUsd: pickNum(r.data['price_usd']) ?? pickNum(r.data['Цена']),
      photoUrl: null,
    })
  }
  for (const r of (aptRes.data ?? []) as RawRow[]) {
    if (r.data['Опубликовать'] !== true) continue
    const title = pickStr(r.data['SEO:Title'])
    if (!title || !title.toLowerCase().includes(lower)) continue
    const slug = pickStr(r.data['SEO:Slug'])
    if (!slug || slug.startsWith('-')) continue
    out.push({
      kind: 'apartment',
      slug,
      title: title.replace(/\s*\|\s*Balinsky\s*$/, '').trim(),
      bedrooms: pickNum(r.data['Комнаты']),
      area: pickNum(r.data['Площадь']),
      priceUsd: pickNum(r.data['price_usd']) ?? pickNum(r.data['Цена']),
      photoUrl: null,
    })
  }
  return out
}

// === complex header for the editor toolbar ===============================

export async function getComplexHeader(airtableId: string): Promise<{ name: string; slug: string } | null> {
  const { data } = await sb
    .from('raw_complexes')
    .select('data')
    .eq('airtable_id', airtableId)
    .maybeSingle()
  if (!data?.data) return null
  const d = data.data as Record<string, unknown>
  const name = pickStr(d['Project'])
  const slug = pickStr(d['SEO:Slug'])
  if (!name || !slug) return null
  return { name, slug }
}

// === row → object adapters ===============================================

type LayerRow = {
  id: number
  complex_airtable_id: string
  parent_layer_id: number | null
  title: string | null
  photo_url: string
  sort_order: number
  created_at: string
  updated_at: string
}
function rowToLayer(r: LayerRow): Layer {
  return {
    id: r.id, complexAirtableId: r.complex_airtable_id,
    parentLayerId: r.parent_layer_id, title: r.title,
    photoUrl: r.photo_url, sortOrder: r.sort_order,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

type HotspotRow = {
  id: number
  layer_id: number
  label: string | null
  polygon: unknown
  target_type: 'layer' | 'unit'
  target_layer_id: number | null
  target_unit_kind: 'villa' | 'apartment' | null
  target_unit_slug: string | null
  availability: HotspotAvailability | null
  sort_order: number
}
function rowToHotspot(r: HotspotRow): Hotspot {
  return {
    id: r.id, layerId: r.layer_id,
    label: r.label,
    polygon: Array.isArray(r.polygon) ? r.polygon as [number, number][] : [],
    targetType: r.target_type,
    targetLayerId: r.target_layer_id,
    targetUnitKind: r.target_unit_kind,
    targetUnitSlug: r.target_unit_slug,
    availability: r.availability ?? null,
    sortOrder: r.sort_order,
  }
}

// === local utils =========================================================

function pickStr(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return pickStr(v[0])
  if (v && typeof v === 'object' && 'value' in v) return pickStr((v as { value: unknown }).value)
  return null
}
function pickNum(v: unknown): number | null {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^\d.\-]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}
