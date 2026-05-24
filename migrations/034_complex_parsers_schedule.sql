-- Adds scheduling + warning-state to complex_parsers.
--
-- interval_minutes — null means "manual only". When set, the
-- /api/cron/run-parsers cron hook runs the parser whenever
-- now() - last_run_at >= interval_minutes.
--
-- last_warning_count — non-fatal issues seen on the last run
-- (rows with malformed price, missing Name, etc.). The admin UI
-- shows green/yellow/red based on status + this value.

alter table public.complex_parsers
  add column if not exists interval_minutes integer,
  add column if not exists last_warning_count integer;

-- Helps the cron hook quickly find rows that are due.
create index if not exists complex_parsers_due_idx
  on public.complex_parsers (last_run_at)
  where interval_minutes is not null;

-- Seed: BALI BAZA Origins price list. complex_id = airtable_id of the
-- Origins record in raw_complexes (looked up via the admin search). The
-- ON CONFLICT clause makes this idempotent if you re-run the migration.
insert into public.complex_parsers (complex_id, source_url, parser_type, interval_minutes, notes)
values (
  'recHuHZIAmVcIln0L',
  'https://docs.google.com/spreadsheets/d/1TWbIAHCWka3ChmSxnl_n1brWpvHWygSgQygDn7SoKMI/edit?gid=1080415579',
  'bali_baza',
  60,
  'BALI BAZA Origins — прайс-лист в Google Sheets, парсим раз в час'
)
on conflict (complex_id) do nothing;
