// Airtable is retired: Supabase is the source of truth (owner's decision,
// 21.11.2026 — objects are edited only in /admin/data) and these scripts would
// overwrite it with stale data. A script runs only if BOTH are set:
//   1) ALLOW_AIRTABLE_LEGACY=1 in the environment;
//   2) public.sync_switches.airtable_import.enabled = true (migration 148).
// The DB flag is the no-deploy kill-switch. Missing row, unreachable DB or
// enabled=false → refuse (fail closed).
import fs from 'node:fs'

function refuse(why) {
  console.error(`[legacy-airtable] refusing to run — ${why}`)
  console.error('[legacy-airtable] Supabase (/admin/data) is the source of truth; running this would overwrite it.')
  console.error('[legacy-airtable] One-off re-import only: ALLOW_AIRTABLE_LEGACY=1 AND')
  console.error("[legacy-airtable]   update public.sync_switches set enabled = true where name = 'airtable_import';")
  process.exit(1)
}

if (process.env.ALLOW_AIRTABLE_LEGACY !== '1') refuse('Airtable was retired (ALLOW_AIRTABLE_LEGACY is not 1).')

const env = { ...process.env }
try {
  for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = l.match(/^([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, '')
  }
} catch { /* no .env.local — rely on process env */ }

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_KEY
if (!url || !key) refuse('cannot read the DB kill-switch (Supabase env missing).')

let enabled = false
try {
  const r = await fetch(`${url}/rest/v1/sync_switches?name=eq.airtable_import&select=enabled`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!r.ok) refuse(`cannot read the DB kill-switch (HTTP ${r.status}).`)
  const rows = await r.json()
  enabled = Array.isArray(rows) && rows[0]?.enabled === true
} catch (e) {
  refuse(`cannot read the DB kill-switch (${e instanceof Error ? e.message : e}).`)
}
if (!enabled) refuse('DB kill-switch sync_switches.airtable_import is off.')
