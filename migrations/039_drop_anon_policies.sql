-- 039: Drop every anon/public/authenticated policy on public tables.
--
-- After 038 enabled RLS everywhere, a handful of tables (ad_banners,
-- complex_parsers, complex_visualization_hotspots/layers, raw_apartments,
-- raw_villas) still returned rows to the anon key — they carry permissive
-- SELECT policies (created ad-hoc in the dashboard, not in any migration)
-- that let `anon`/`public` read despite RLS being on.
--
-- Nothing in any project uses the anon key (every Supabase client across
-- balinsky, balinsky-sync and presentation.estate is service_role), so we
-- drop all policies granted to anon/public/authenticated and keep only the
-- "service_role full access" policy from 038. Result: every public table is
-- service-role-only.
--
-- Idempotent and self-contained: re-asserts RLS at the end too.

do $$
declare
  p record;
  t record;
begin
  -- Remove any policy that exposes a table to anon / public / authenticated.
  for p in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and policyname <> 'service_role full access'
      and (roles && array['anon', 'public', 'authenticated']::name[])
  loop
    execute format('drop policy if exists %I on public.%I;', p.policyname, p.tablename);
  end loop;

  -- Belt-and-suspenders: make sure RLS is on for every public table.
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', t.tablename);
  end loop;
end $$;
