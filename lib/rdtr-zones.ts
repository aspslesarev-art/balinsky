// Зоны плана застройки (RDTR) вокруг объекта: данные готовит
// scripts/rdtr_zones.py -> Storage feeds/_rdtr-zones/<slug>.json (+ .jpg
// превью). Здесь - типы, группы зон и короткая сводка для карточки.

export type RdtrZone = { name: string; code: string | null; color: string; share: number; geometry: GeoJSON.Geometry }
export type RdtrData = {
  center: [number, number]; radius: number; regulation: string | null; fetchedAt?: string
  plot: { name: string | null; code: string | null; kdb: string | null; kdh: string | null; klb: string | null } | null
  zones: RdtrZone[]
}

export type ZoneGroup = 'build' | 'nobuild' | 'other'
type Kind = { re: RegExp; group: ZoneGroup; ru: string; en: string }

// Название зоны Индонезии -> группа и подпись. Первое совпадение.
const KINDS: Kind[] = [
  { re: /^Perumahan/i, group: 'build', ru: 'Жильё', en: 'Housing' },
  { re: /^Perdagangan/i, group: 'build', ru: 'Торговля и услуги', en: 'Shops & services' },
  { re: /^Pariwisata/i, group: 'build', ru: 'Туризм', en: 'Tourism' },
  { re: /^Perkantoran/i, group: 'build', ru: 'Офисы', en: 'Offices' },
  { re: /^Tanaman Pangan/i, group: 'nobuild', ru: 'Рисовые поля', en: 'Rice fields' },
  { re: /^Perkebunan/i, group: 'nobuild', ru: 'Плантации', en: 'Plantations' },
  { re: /^(Badan Air|Perlindungan Setempat|Sempadan)/i, group: 'nobuild', ru: 'Реки и охранные полосы', en: 'Rivers & buffer zones' },
  { re: /^(Taman|Rimba|Jalur Hijau|Pemakaman|Ruang Terbuka Hijau)/i, group: 'nobuild', ru: 'Парки и кладбища', en: 'Parks & cemeteries' },
  { re: /^(Hutan|Kawasan Hutan)/i, group: 'nobuild', ru: 'Лес', en: 'Forest' },
  { re: /^Badan Jalan/i, group: 'other', ru: 'Дороги', en: 'Roads' },
  { re: /^SPU/i, group: 'other', ru: 'Школы, храмы, больницы', en: 'Schools, temples, clinics' },
]

export function zoneKind(name: string): Kind | null {
  return KINDS.find(k => k.re.test(name)) ?? null
}

export const zoneRu = (lang: string) => lang === 'ru' || lang === 'uk'

/** Строки легенды: зоны свёрнуты в понятные группы, доли сложены. */
export function zoneRows(data: RdtrData, lang: string) {
  const ru = zoneRu(lang)
  const rows = new Map<string, { label: string; group: ZoneGroup; color: string; share: number }>()
  for (const z of data.zones) {
    const k = zoneKind(z.name)
    const label = k ? (ru ? k.ru : k.en) : z.name
    const prev = rows.get(label)
    if (prev) prev.share += z.share
    else rows.set(label, { label, group: k?.group ?? 'other', color: z.color, share: z.share })
  }
  return [...rows.values()].filter(r => r.share >= 0.005).sort((a, b) => b.share - a.share)
}

/** Подпись зоны участка: «Жильё · R-3». */
export function plotLabel(data: RdtrData, lang: string): { label: string; color: string | null } | null {
  if (!data.plot?.name) return null
  const k = zoneKind(data.plot.name)
  const base = k ? (zoneRu(lang) ? k.ru : k.en) : data.plot.name
  return {
    label: `${base}${data.plot.code ? ` · ${data.plot.code}` : ''}`,
    color: data.zones.find(z => z.name === data.plot?.name)?.color ?? null,
  }
}

export const pctText = (s: number) => `${Math.max(1, Math.round(s * 100))}%`

export const RDTR_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/feeds/_rdtr-zones`

/** Зоны для страницы объекта: свой файл комплекса (CITRINE), иначе клетка
 *  объекта из _index.json (scripts/rdtr_zones_all.py). key - имя файла. */
export async function loadRdtr(airtableId: string | null, complexSlug: string | null): Promise<{ key: string; data: RdtrData } | null> {
  const get = (key: string) =>
    fetch(`${RDTR_BASE}/${key}.json`, { next: { revalidate: 86400 } }).then(r => (r.ok ? (r.json() as Promise<RdtrData>) : null)).catch(() => null)
  if (complexSlug) {
    const data = await get(complexSlug)
    if (data) return { key: complexSlug, data }
  }
  if (!airtableId) return null
  // Индекс дописывается при каждом прогоне скрипта - держим не дольше часа.
  const index = await fetch(`${RDTR_BASE}/_index.json`, { next: { revalidate: 3600 } })
    .then(r => (r.ok ? (r.json() as Promise<Record<string, string | { k: string; n: string | null; c: string | null }>>) : null)).catch(() => null)
  const hit = index?.[airtableId]
  if (!hit) return null
  const key = typeof hit === 'string' ? hit : hit.k
  const data = await get(key)
  if (!data) return null
  // Файл общий для соседей по клетке - зону участка берём свою.
  if (typeof hit !== 'string' && hit.n && hit.n !== data.plot?.name) {
    return { key, data: { ...data, plot: { name: hit.n, code: hit.c, kdb: null, kdh: null, klb: null } } }
  }
  return { key, data }
}
