// Units in `parser_units` are keyed `<complex_id>#<gid>#<Name>` and carry the
// complex twice: its name (`Комплекс`, what the editor picks) and its id
// (`complex_id`, what the availability snapshot groups by). The admin picker
// stores the name, so the id is looked up here — on create, and whenever the
// editor moves a unit to another complex.

import { adminSb } from './sb'
import type { CollectionConfig } from './adapters/types'

const COMPLEX_NAME = 'Комплекс'
// gid was the Google Sheets tab id the parser read the unit from. A unit
// entered by hand has no tab; `manual` keeps the key shape and marks origin.
const MANUAL_GID = 'manual'

async function complexIdByName(name: string): Promise<string | null> {
  const wanted = name.trim()
  // The picker offers trimmed titles while some stored names carry stray
  // spaces (" Melasti Apartments"), so match loosely, then compare trimmed.
  const pattern = wanted.replace(/[%_\\]/g, m => `\\${m}`)
  const { data, error } = await adminSb()
    .from('raw_complexes')
    .select('airtable_id, name:data->>Project')
    .ilike('data->>Project', `%${pattern}%`)
    .limit(50)
  if (error) throw new Error(error.message)
  const rows = ((data ?? []) as { airtable_id: string; name: string | null }[])
    .filter(r => (r.name ?? '').trim() === wanted)
  // Two complexes with the same name: refuse rather than guess.
  if (rows.length !== 1) return null
  return rows[0].airtable_id
}

/** Extra fields a parser-unit write needs. Empty for other collections. */
export async function parserUnitPatch(
  cfg: CollectionConfig,
  patch: Record<string, unknown>,
  opts: { create: boolean },
): Promise<Record<string, unknown>> {
  if (cfg.key !== 'parser_units') return {}
  const out: Record<string, unknown> = {}
  if (opts.create) {
    out.gid = MANUAL_GID
    out.source = 'manual'
  }
  if (COMPLEX_NAME in patch) {
    const name = typeof patch[COMPLEX_NAME] === 'string' ? (patch[COMPLEX_NAME] as string) : ''
    if (!name.trim()) {
      if (opts.create) throw new Error('Выберите комплекс')
      return out
    }
    const id = await complexIdByName(name)
    if (!id) throw new Error(`Комплекс «${name.trim()}» не найден или не единственный`)
    out.complex_id = id
  } else if (opts.create) {
    throw new Error('Выберите комплекс')
  }
  return out
}
