// Shared service-role Supabase client for the admin "data" engine.
// Server-only — uses SUPABASE_SERVICE_KEY, never import from client code.
// Mirrors the inline pattern in app/ru/villy/_lib.ts:16 / lib/banners.ts:18
// but centralised so every adapter reuses one client instance.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

let _sb: SupabaseClient | null = null

export function adminSb(): SupabaseClient {
  if (_sb) return _sb
  _sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)
  return _sb
}

export function supabaseUrl(): string {
  return SUPABASE_URL
}

// True for PostgREST/Postgres "table or column missing" errors, so the admin
// UI can show a helpful "apply migration" hint instead of a generic 500.
export function isMissingTableError(e: { code?: string; message?: string } | null | undefined): boolean {
  if (!e) return false
  return e.code === '42P01' || e.code === 'PGRST205' || e.code === 'PGRST204'
    || /could not find the table/i.test(e.message ?? '')
    || /relation .* does not exist/i.test(e.message ?? '')
    || /schema cache/i.test(e.message ?? '')
}
