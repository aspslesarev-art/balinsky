// Airtable is retired: Supabase is the source of truth and these scripts
// would overwrite it with stale data. Refuses to run unless someone
// deliberately sets ALLOW_AIRTABLE_LEGACY=1 for a one-off re-import.
if (process.env.ALLOW_AIRTABLE_LEGACY !== '1') {
  console.error('[legacy-airtable] refusing to run — Airtable was retired 2026-07-22.')
  console.error('[legacy-airtable] Supabase (/admin/data) is the source of truth; running this would overwrite it.')
  console.error('[legacy-airtable] Set ALLOW_AIRTABLE_LEGACY=1 only for a deliberate one-off re-import.')
  process.exit(1)
}
