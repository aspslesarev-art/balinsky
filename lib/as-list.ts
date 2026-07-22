// Records written by hand in /admin/data only carry the fields the editor
// actually filled in, so an optional list can simply be absent — the Airtable
// sync used to guarantee every key existed on every record. One manager saved
// without developers took every /zastrojshhiki/<slug> page down with a 500, so
// treat a missing list as empty wherever loaders or pages iterate one.
export function asList<T>(v: T[] | undefined | null): T[] {
  return Array.isArray(v) ? v : []
}
