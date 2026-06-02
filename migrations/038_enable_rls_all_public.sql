-- 038: Enable Row-Level Security on every table in the public schema.
--
-- Supabase flagged `rls_disabled_in_public` (critical): tables without RLS
-- are reachable by the anon/public API key, which can read — and, where the
-- anon role holds write grants, modify or delete — their rows.
--
-- This app talks to Postgres exclusively through the service_role key on the
-- server (every createClient(..., SUPABASE_SERVICE_KEY) — there is no browser
-- client; NEXT_PUBLIC_SUPABASE_ANON_KEY is never referenced in the codebase).
-- So enabling RLS with only a service_role policy denies the anon key without
-- affecting the site. The explicit service_role FOR ALL policy mirrors the
-- existing convention in 032 and guarantees server access regardless of
-- whether service_role carries BYPASSRLS.
--
-- Idempotent: re-enabling RLS is a no-op, and `drop policy if exists` lets the
-- block be re-run safely. The loop also covers any future sync-created tables.

do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
    execute format('drop policy if exists "service_role full access" on public.%I;', r.tablename);
    execute format(
      'create policy "service_role full access" on public.%I '
      || 'for all to service_role using (true) with check (true);',
      r.tablename
    );
  end loop;
end $$;
