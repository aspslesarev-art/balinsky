// Keep the competitor tiles in step with the competitor manifest.
//
// Pages never read competitors/_competitors.json directly for "who rents
// nearby" — that file is ~14 MB. They read 0.05° tiles (competitors/_cells/
// <lat>_<lng>.json) listed in competitors/_cells.json (lib/competitors.ts →
// loadNearby). The retired Airtable sync rebuilt every tile on each run
// (scripts/legacy-airtable/sync-competitors.mjs); an admin edit touches one
// record, so only the tile(s) that record left and entered are rewritten.

import { adminSb } from './sb'

const BUCKET = 'competitors'
const INDEX_KEY = '_cells.json'
// Must match the sync script and lib/competitors.ts (idx.cellDeg).
const CELL = 0.05

type Item = Record<string, unknown>
type CellIndex = { generatedAt?: string; cellDeg?: number; cells: string[] }

function cellKey(it: Item | null | undefined): string | null {
  if (!it) return null
  const lat = it.lat, lng = it.lng
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return `${Math.floor(lat / CELL)}_${Math.floor(lng / CELL)}`
}

async function upload(key: string, body: unknown): Promise<void> {
  const { error } = await adminSb().storage.from(BUCKET).upload(key, Buffer.from(JSON.stringify(body)), {
    contentType: 'application/json', upsert: true, cacheControl: '60',
  })
  if (error) throw new Error(`storage(${BUCKET}/${key}): ${error.message}`)
}

async function loadIndex(): Promise<CellIndex | null> {
  const { data, error } = await adminSb().storage.from(BUCKET).download(INDEX_KEY)
  if (error || !data) return null
  try {
    const j = JSON.parse(await data.text()) as CellIndex
    return Array.isArray(j.cells) ? j : null
  } catch {
    return null
  }
}

/**
 * Rewrite the tiles a changed record touches.
 * @param items the full manifest as just saved
 * @param before the record before the change (null on create)
 * @param after the record after the change (null on delete)
 */
export async function syncCompetitorCells(items: Item[], before: Item | null, after: Item | null): Promise<void> {
  const keys = new Set([cellKey(before), cellKey(after)].filter((k): k is string => !!k))
  if (keys.size === 0) return

  for (const key of keys) {
    const list = items.filter(it => cellKey(it) === key)
    await upload(`_cells/${key}.json`, list)
  }

  // The index lists which tiles exist; loadNearby only fetches listed ones,
  // so a record moved into a brand-new tile must be added here. An emptied
  // tile is left listed — it is a valid, empty file.
  const index = await loadIndex()
  if (!index) return
  const known = new Set(index.cells)
  const added = [...keys].filter(k => !known.has(k))
  if (added.length === 0) return
  await upload(INDEX_KEY, {
    generatedAt: new Date().toISOString(),
    cellDeg: index.cellDeg ?? CELL,
    cells: [...index.cells, ...added],
  })
}

/** Post-write hooks for manifest collections, keyed by collection key. */
export const MANIFEST_WRITE_HOOKS: Record<string, typeof syncCompetitorCells> = {
  competitors: syncCompetitorCells,
}
