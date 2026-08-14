// Defaults applied when a unit (villa / apartment) is created in the admin.
//
// Why this exists: Airtable filled three things by formula/lookup that the
// editor never typed — the unit title, the district / status / terms copied
// down from the parent complex, and the slug. Without them a row created here
// looks complete in the grid but is INVISIBLE on the site: the complex page
// and the slug index both drop units whose `SEO:Slug` is empty
// (lib/admin/detail-index.ts → entryFor), and a unit with no district renders
// a card with blank facts.
//
// Everything here only ever fills fields the editor left EMPTY.

import { adminSb } from './sb'
import { normalizeSlug } from '../slug-normalize'
import type { CollectionConfig } from './adapters/types'

/** Collections that are "units inside a complex". */
export type UnitKind = 'villa' | 'apartment'

export function unitKindOf(cfg: CollectionConfig): UnitKind | null {
  if (cfg.key === 'villas') return 'villa'
  if (cfg.key === 'apartments') return 'apartment'
  return null
}

function firstString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return firstString(v[0])
  if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) {
    return firstString((v as Record<string, unknown>).value)
  }
  return ''
}

function firstNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.').replace(/[^\d.-]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  if (Array.isArray(v) && v.length) return firstNumber(v[0])
  return null
}

const isEmpty = (v: unknown): boolean =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0)

/** Район as the card and the title show it. Villas keep the name in
 *  `Location 2`, apartments in `Location filter` (the two collections mirror
 *  each other — see lib/admin/collections.ts). */
function districtOf(kind: UnitKind, fields: Record<string, unknown>): string {
  return kind === 'villa'
    ? firstString(fields['Location 2']) || firstString(fields['Location'])
    : firstString(fields['Location filter']) || firstString(fields['Location'])
}

function bedroomWord(n: number | null): string {
  if (n == null) return 'спальни'
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'спальня'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'спальни'
  return 'спален'
}

/**
 * The unit headline, in the exact shape Airtable's formula produced:
 * `Вилла <Комплекс> в <Район> - <Площадь> м², <N> спальни | Balinsky`.
 * Deterministic on purpose — an editor adding ten units of one complex gets
 * ten consistent titles instantly, with no Azure call and no wait.
 */
export function unitTitle(kind: UnitKind, fields: Record<string, unknown>): string {
  const complex = firstString(fields['Комплекс 1'])
  const district = districtOf(kind, fields)
  const area = firstNumber(fields['Площадь'])
  const rooms = firstNumber(fields['Комнаты'])
  const head = kind === 'villa' ? 'Вилла' : 'Апартаменты'

  const subject = [head, complex].filter(Boolean).join(' ')
  const where = district ? ` в ${district}` : ''
  const facts = [
    area != null ? `${area} м²` : '',
    rooms != null ? `${rooms} ${bedroomWord(rooms)}` : '',
  ].filter(Boolean).join(', ')

  return `${subject}${where}${facts ? ` - ${facts}` : ''} | Balinsky`
}

/**
 * Slug base for a unit, mirroring the shape the catalogue already carries
 * (`swoi-berawa-197m2-3-bedroom`). The adapter de-duplicates it against the
 * table before writing.
 */
export function unitSlugBase(kind: UnitKind, fields: Record<string, unknown>): string {
  const area = firstNumber(fields['Площадь'])
  const rooms = firstNumber(fields['Комнаты'])
  const parts = [
    firstString(fields['Комплекс 1']) || firstString(fields['Developer1']),
    districtOf(kind, fields),
    area != null ? `${area}m2` : '',
    rooms != null ? `${rooms}-bedroom` : '',
  ].filter(Boolean)
  return normalizeSlug(parts.join('-'))
}

// Unit key ← complex key. The complex is the authority on where the project
// is, when it hands over and on what terms — copying these down is what the
// Airtable lookup columns did, and the unit card reads them straight.
// NB: `Year of completion ` in raw_complexes carries a trailing space.
const INHERITED_FROM_COMPLEX: ReadonlyArray<readonly [unitKey: string, complexKeys: readonly string[]]> = [
  ['Location', ['Location']],
  ['Location 2', ['Location 2']],
  ['Статус', ['Статус']],
  ['Year of completion', ['Year of completion ', 'Year of completion']],
  ['Land color', ['Land color']],
  ['Leasehold', ['Leasehold']],
  ['Разрешение', ['Разрешительные документы']],
  ['Geo', ['Geo']],
  ['Developer1', ['Developer1']],
]

/** The linked complex's `data` blob, or null when nothing is linked. */
async function loadLinkedComplex(fields: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const link = fields['Комплекс']
  const id = Array.isArray(link) ? firstString(link[0]) : firstString(link)
  if (!id) return null
  const { data, error } = await adminSb()
    .from('raw_complexes')
    .select('data')
    .eq('airtable_id', id)
    .maybeSingle()
  if (error || !data) return null
  return (data as { data?: Record<string, unknown> }).data ?? null
}

/**
 * Values to add to a newly created unit: everything inherited from its complex
 * that the editor left empty, plus the generated title. Returns an empty object
 * for non-unit collections, so the caller can apply it unconditionally.
 *
 * A failed complex lookup is swallowed — inheritance is a convenience, and a
 * Supabase hiccup must not block the save the editor just made.
 */
export async function unitCreateDefaults(
  cfg: CollectionConfig,
  fields: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const kind = unitKindOf(cfg)
  if (!kind) return {}

  const patch: Record<string, unknown> = {}
  try {
    const complex = await loadLinkedComplex(fields)
    if (complex) {
      for (const [unitKey, complexKeys] of INHERITED_FROM_COMPLEX) {
        if (!isEmpty(fields[unitKey])) continue
        for (const ck of complexKeys) {
          if (isEmpty(complex[ck])) continue
          patch[unitKey] = complex[ck]
          break
        }
      }
    }
  } catch {
    // Inheritance is a convenience, never a precondition for saving.
  }

  if (isEmpty(fields[cfg.titleField])) {
    patch[cfg.titleField] = unitTitle(kind, { ...fields, ...patch })
  }
  return patch
}
