-- Service-role write access for villa_land_profile.
-- Tables created via the Supabase SQL editor don't auto-grant
-- access to service_role — same pattern as 003_bot_grants.sql and
-- 010_raw_developers_grants.sql. Without this the sync script's
-- POST /rest/v1/villa_land_profile returns 403.

GRANT ALL PRIVILEGES ON TABLE public.villa_land_profile TO service_role;
