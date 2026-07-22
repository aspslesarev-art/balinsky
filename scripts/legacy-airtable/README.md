# Retired: Airtable sync

Airtable stopped being the source of truth on **2026-07-22**. Everything in
this folder pulled records from Airtable and upserted them into Supabase
`raw_*` tables or Storage manifests — which is precisely what kept overwriting
edits made in the admin panel at `/admin/data`.

**Supabase is now the source of truth.** Running any of these scripts against
production would replay stale Airtable data over current content, so each one
refuses to start unless `ALLOW_AIRTABLE_LEGACY=1` is set. Only do that for a
deliberate one-off re-import, and only after checking what the script upserts
and prunes.

Kept (not moved here) because they read Supabase only and are still live:

- `scripts/sync-detail-indexes.mjs` — slug → id indexes, nightly safety net
- `scripts/translate-missing.mjs` — fills missing translations
- `scripts/sync-nearby-places.mjs`, `sync-baliforum-places.mjs`, `sync-redirects-index.mjs`

Removed along with these scripts: `.github/workflows/sync-fast.yml`,
`sync-heavy.yml`, `sync-once-maison.yml`, `app/api/webhook/airtable/`,
`app/api/cron/sync-trigger/`, and the two `sync-trigger` cron entries in
`vercel.json`. The `SYNC_DISABLED` repo variable is redundant now but harmless.
