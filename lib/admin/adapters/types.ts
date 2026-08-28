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
  | 'multienum' // several values from the same list; stored as a string[]
  | 'percent'   // shown as 0–100 %, stored as the 0–1 fraction the site reads
  | 'date'
  | 'photos' // synthetic — backed by a per-record photo manifest (lib/admin/photos.ts)
  | 'geo'
  | 'link' // Airtable-style link to a record in another collection
  | 'image' // single image stored as a URL — upload/download/delete via Supabase
  | 'json' // raw fallback for un-modelled / complex values (read-only in the panel)

// How a `link` field stores its value in the data, mirroring Airtable.
export type LinkConfig = {
  /** Target collection key to pick from (e.g. 'complexes'). */
  collection: string
  /** How the picked record is stored on THIS field:
   *  - 'id-array'   → [airtable_id]     (villas/apartments Комплекс, Developer)
   *  - 'name'       → "Project name"    (complexes Developer)
   *  - 'name-slug'  → [{ name, slug }]  (news/promo/events `developers`) —
   *    the shape the retired Airtable lookup wrote, and the shape the public
   *    pages filter on: `n.developers.some(d => d.slug === devSlug)`.
   *  - 'name-array' → ["Project name"] (managers `developerNames`) — the same
   *    Airtable-era link, but split across two parallel arrays; pair it with
   *    `slugArrayField` so the slug half stays in sync. */
  store: 'id-array' | 'name' | 'name-slug' | 'name-array'
  /** Optional companion field to also set with the picked record's title
   *  (Airtable lookup column, e.g. 'Комплекс 1' / 'Developer1'). */
  nameField?: string
  /** Same, but stored as a one-element array — for the manifest lookup
   *  columns Airtable emitted as arrays (news/promo `complexNames`). */
  nameArrayField?: string
  /** Companion field holding the picked records' slugs, index-aligned with the
   *  names. The managers manifest keeps `developerNames` / `developerSlugs`
   *  side by side and lib/managers.ts filters by the slug half. Requires the
   *  target collection to declare `slugField`. */
  slugArrayField?: string
  /** Allow several picks (a manager can work for more than one developer).
   *  Only for array-shaped stores — 'name' holds a single string. Multi-value
   *  links are edited in the side panel; the grid shows them read-only. */
  multi?: boolean
}

export type StoreType = 'sql_jsonb' | 'storage_manifest' | 'sql_columns'

export type FieldDef = {
  /** JSON key inside `data` (sql_jsonb) OR item property (manifest) OR column name (sql_columns). */
  key: string
  /** RU label shown in the grid header + side panel. */
  label: string
  type: FieldType
  /** Fixed choices for enum/multienum. Omit to offer the values already
   *  present in the column instead (see lib/admin/field-values.ts) — that
   *  stays correct as editors introduce new statuses. */
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
  /** Never show this field (e.g. raw Airtable attachment text). */
  hidden?: boolean
  /** For type 'date': also pick a time. Entered and stored as Bali wall-clock
   *  (`…T18:00:00+08:00`) — an event's start is a Bali-local fact, not the
   *  editor's timezone. See lib/datetime.ts. */
  withTime?: boolean
  /** For sql_jsonb stores: this key is a real top-level COLUMN (e.g.
   *  developers.logo_url), not a key inside the `data` JSONB blob. */
  column?: boolean
  /** Opt this field out of the automatic AI fill on save
   *  (lib/admin/ai-autofill.ts) even though its name matches a generator.
   *  For fields where EMPTY is a meaningful state — e.g. the complex
   *  description override, where empty means "keep the generated text". */
  noAi?: boolean
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
  /** Storage bucket for single-image (`image`) field uploads. */
  uploadBucket?: string
  caps: Caps
  /** Field used as the row's headline in the grid + panel title. */
  titleField: string
  /** Field holding the public slug. Only needed when another collection
   *  links here with `store: 'name-slug'` and has to store that slug. */
  slugField?: string
  /** Boolean published flag, e.g. 'Опубликовать'. */
  publishedField?: string
  defaultSort?: { field: string; dir: 'asc' | 'desc' }
  /** key passed to the content-revalidate map after a mutation. */
  revalidateKind?: string
  /** Data keys to never surface (raw Airtable attachment / junk fields). */
  hideFields?: string[]
  /** Columns hidden in the grid by default. Unlike `hideFields` these stay
   *  available — the «Колонки» menu switches any of them back on and remembers
   *  the choice per browser. For tables where ~140 mostly auto-filled keys
   *  otherwise bury the dozen an editor actually fills in. */
  defaultHiddenColumns?: string[]
  /** Ordered field keys the «Создать» form shows. Everything else is left out
   *  of that form (and stays editable in the record card afterwards), so adding
   *  a repeating record is filling one short fixed form — the Airtable
   *  behaviour editors are used to. Omit to show every field. */
  createFields?: string[]
  /** Keys never copied when a row is duplicated — anything that must stay
   *  unique. The primary key and the slug are handled by the duplicate
   *  endpoint itself. */
  duplicateSkip?: string[]
  /** Столбцы-дубли: один смысл — один столбец. Сетка динамическая (показывает
   *  ВСЕ ключи, которые есть в data), поэтому кнопка «Добавить поле» легко
   *  рождает второй столбец под то же самое. Правило прячет такие ключи и
   *  оставляет канонический. */
  dedupe?: DedupeRule[]
  fields: FieldDef[]
}

/** Как узнать дубль. Конфиг уезжает в клиентский компонент (сетка), поэтому
 *  функции в нём хранить нельзя — распознаватель назван здесь, а разрешается
 *  в lib/admin/fields.ts. */
export type DedupeMatcher = 'google-map-link'

export type DedupeRule = {
  /** Ключ, который остаётся видимым и в который сливаются значения дублей. */
  canonical: string
  matcher: DedupeMatcher
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
