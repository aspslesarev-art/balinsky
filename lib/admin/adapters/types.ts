// Core types for the universal admin data engine ("свой Airtable").
//
// The engine is config-driven: lib/admin/collections.ts declares every
// editable collection, and a DataSourceAdapter knows how to read/write the
// underlying store (SQL JSONB table, Storage JSON manifest, or plain SQL
// columns). The UI always works with a flat `fields` map; adapters translate
// to/from the store shape.

export type FieldType =
  | 'text'
  | 'longtext'
  | 'number'
  | 'bool'
  | 'enum'
  | 'date'
  | 'photos' // synthetic — backed by a per-record photo manifest (lib/admin/photos.ts)
  | 'geo'
  | 'link' // Airtable-style link to a record in another collection
  | 'json' // raw fallback for un-modelled / complex values (read-only in the panel)

// How a `link` field stores its value in the data, mirroring Airtable.
export type LinkConfig = {
  /** Target collection key to pick from (e.g. 'complexes'). */
  collection: string
  /** How the picked record is stored on THIS field:
   *  - 'id-array'  → [airtable_id]   (villas/apartments Комплекс, Developer)
   *  - 'name'      → "Project name"  (complexes Developer) */
  store: 'id-array' | 'name'
  /** Optional companion field to also set with the picked record's title
   *  (Airtable lookup column, e.g. 'Комплекс 1' / 'Developer1'). */
  nameField?: string
}

export type StoreType = 'sql_jsonb' | 'storage_manifest' | 'sql_columns'

export type FieldDef = {
  /** JSON key inside `data` (sql_jsonb) OR item property (manifest) OR column name (sql_columns). */
  key: string
  /** RU label shown in the grid header + side panel. */
  label: string
  type: FieldType
  enumOptions?: string[]
  /** Computed / Airtable-owned — render but block editing. */
  readOnly?: boolean
  /** Show as a grid column (otherwise panel-only). */
  showInGrid?: boolean
  /** Grid column width hint, px. */
  width?: number
  help?: string
  /** For type 'link' — where to pick from and how to store. */
  link?: LinkConfig
}

export type Caps = { create: boolean; update: boolean; delete: boolean }

export type CollectionConfig = {
  /** URL segment, e.g. 'villas'. */
  key: string
  /** Human label, e.g. 'Виллы'. */
  label: string
  store: StoreType
  // sql_jsonb / sql_columns:
  table?: string
  primaryKey?: string // 'airtable_id' | 'slug' | ...
  // storage_manifest:
  bucket?: string
  manifestKey?: string // '_news.json'
  itemIdKey?: string // property used as record id inside items[]
  // photos (optional):
  photo?: { bucket: string; manifestKey?: string /* default _manifest.json */ }
  caps: Caps
  /** Field used as the row's headline in the grid + panel title. */
  titleField: string
  /** Boolean published flag, e.g. 'Опубликовать'. */
  publishedField?: string
  defaultSort?: { field: string; dir: 'asc' | 'desc' }
  /** key passed to the content-revalidate map after a mutation. */
  revalidateKind?: string
  fields: FieldDef[]
}

/** A record as the UI sees it: an id plus a flat key→value map. */
export type RecordRow = { id: string; fields: Record<string, unknown> }

export type ColumnFilter = { key: string; value: string }

export type ListQuery = {
  page?: number
  pageSize?: number
  sort?: { field: string; dir: 'asc' | 'desc' }
  /** Free-text search (matched against the title field / all text fields). */
  q?: string
  /** Per-column "contains" filters (AND-ed). */
  filters?: ColumnFilter[]
}

export type ListResult = { rows: RecordRow[]; total: number }

export interface DataSourceAdapter {
  /** One page of rows with their FULL field set (Airtable-parity). */
  list(cfg: CollectionConfig, q: ListQuery): Promise<ListResult>
  /** Full record (all modelled fields) for the side panel. */
  get(cfg: CollectionConfig, id: string): Promise<RecordRow | null>
  create(cfg: CollectionConfig, fields: Record<string, unknown>): Promise<RecordRow>
  update(cfg: CollectionConfig, id: string, patch: Record<string, unknown>): Promise<void>
  remove(cfg: CollectionConfig, id: string): Promise<void>
}
