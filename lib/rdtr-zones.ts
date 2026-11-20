// Зоны плана застройки (RDTR) вокруг объекта: данные готовит
// scripts/rdtr_zones.py -> Storage feeds/_rdtr-zones/<slug>.json (+ .jpg
// превью). Здесь - типы, группы зон и короткая сводка для карточки.

import type { Lang } from './i18n'

export type RdtrZone = { name: string; code: string | null; color: string; share: number; geometry: GeoJSON.Geometry }
export type RdtrData = {
  center: [number, number]; radius: number; regulation: string | null; fetchedAt?: string
  plot: { name: string | null; code: string | null; kdb: string | null; kdh: string | null; klb: string | null } | null
  zones: RdtrZone[]
}

export type ZoneGroup = 'build' | 'nobuild' | 'other'
type Kind = { re: RegExp; group: ZoneGroup; ru: string; en: string; l: Record<Exclude<Lang, 'ru' | 'en'>, string> }
// id · fr · de · zh · nl · ban · pl · uk
const t8 = (id: string, fr: string, de: string, zh: string, nl: string, ban: string, pl: string, uk: string) => ({ id, fr, de, zh, nl, ban, pl, uk })

// Название зоны Индонезии -> группа и подпись. Первое совпадение.
const KINDS: Kind[] = [
  { re: /^Perumahan/i, group: 'build', ru: 'Жильё', en: 'Housing', l: t8('Perumahan', 'Habitat', 'Wohnen', '住宅', 'Wonen', 'Perumahan', 'Mieszkalnictwo', 'Житло') },
  { re: /^Perdagangan/i, group: 'build', ru: 'Торговля и услуги', en: 'Shops & services', l: t8('Perdagangan dan jasa', 'Commerces et services', 'Handel und Dienstleistungen', '商业与服务', 'Handel en diensten', 'Perdagangan lan jasa', 'Handel i usługi', 'Торгівля та послуги') },
  { re: /^Pariwisata/i, group: 'build', ru: 'Туризм', en: 'Tourism', l: t8('Pariwisata', 'Tourisme', 'Tourismus', '旅游', 'Toerisme', 'Pariwisata', 'Turystyka', 'Туризм') },
  { re: /^Perkantoran/i, group: 'build', ru: 'Офисы', en: 'Offices', l: t8('Perkantoran', 'Bureaux', 'Büros', '办公', 'Kantoren', 'Perkantoran', 'Biura', 'Офіси') },
  { re: /^Tanaman Pangan/i, group: 'nobuild', ru: 'Рисовые поля', en: 'Rice fields', l: t8('Sawah', 'Rizières', 'Reisfelder', '稻田', 'Rijstvelden', 'Carik', 'Pola ryżowe', 'Рисові поля') },
  { re: /^Perkebunan/i, group: 'nobuild', ru: 'Плантации', en: 'Plantations', l: t8('Perkebunan', 'Plantations', 'Plantagen', '种植园', 'Plantages', 'Perkebunan', 'Plantacje', 'Плантації') },
  { re: /^(Badan Air|Perlindungan Setempat|Sempadan)/i, group: 'nobuild', ru: 'Реки и охранные полосы', en: 'Rivers & buffer zones', l: t8('Sungai dan sempadan', 'Rivières et zones tampons', 'Flüsse und Schutzstreifen', '河流与缓冲带', 'Rivieren en bufferzones', 'Tukad lan sempadan', 'Rzeki i strefy ochronne', 'Річки та охоронні смуги') },
  { re: /^(Taman|Rimba|Jalur Hijau|Pemakaman|Ruang Terbuka Hijau)/i, group: 'nobuild', ru: 'Парки и кладбища', en: 'Parks & cemeteries', l: t8('Taman dan pemakaman', 'Parcs et cimetières', 'Parks und Friedhöfe', '公园与墓地', 'Parken en begraafplaatsen', 'Taman lan setra', 'Parki i cmentarze', 'Парки та кладовища') },
  { re: /^(Hutan|Kawasan Hutan)/i, group: 'nobuild', ru: 'Лес', en: 'Forest', l: t8('Hutan', 'Forêt', 'Wald', '森林', 'Bos', 'Alas', 'Las', 'Ліс') },
  { re: /^Badan Jalan/i, group: 'other', ru: 'Дороги', en: 'Roads', l: t8('Jalan', 'Routes', 'Straßen', '道路', 'Wegen', 'Margi', 'Drogi', 'Дороги') },
  { re: /^SPU/i, group: 'other', ru: 'Школы, храмы, больницы', en: 'Schools, temples, clinics', l: t8('Sekolah, pura, klinik', 'Écoles, temples, cliniques', 'Schulen, Tempel, Kliniken', '学校、寺庙、诊所', 'Scholen, tempels, klinieken', 'Sekolah, pura, klinik', 'Szkoły, świątynie, przychodnie', 'Школи, храми, лікарні') },
]

/** Подпись группы зоны на языке страницы. */
export function zoneName(k: Kind, lang: string): string {
  return lang === 'ru' ? k.ru : lang === 'en' ? k.en : k.l[lang as keyof Kind['l']] ?? k.en
}

export function zoneKind(name: string): Kind | null {
  return KINDS.find(k => k.re.test(name)) ?? null
}

export const zoneRu = (lang: string) => lang === 'ru'

/** Строки легенды: зоны свёрнуты в понятные группы, доли сложены. */
export function zoneRows(data: RdtrData, lang: string) {
  const rows = new Map<string, { label: string; group: ZoneGroup; color: string; share: number }>()
  for (const z of data.zones) {
    const k = zoneKind(z.name)
    const label = k ? zoneName(k, lang) : z.name
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
  const base = k ? zoneName(k, lang) : data.plot.name
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
  const index = await fetch(`${RDTR_BASE}/_index.json`, { next: { revalidate: 86400 } })
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
