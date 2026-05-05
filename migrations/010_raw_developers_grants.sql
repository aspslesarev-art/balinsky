-- Grant write access on raw_developers + raw_apartments to service_role.
--
-- Both tables were originally populated by an external pipeline that owned the
-- relation, so service_role only had SELECT (and UPDATE(logo_url) on developers).
-- Adding the in-repo sync (scripts/sync-developers.mjs, sync-apartments-data.mjs)
-- requires UPDATE/INSERT on the full row — same pattern as 003_bot_grants.sql.
grant all privileges on table public.raw_developers  to service_role;
grant all privileges on table public.raw_apartments  to service_role;
