-- Fix: service_role lost privileges on balina_usage after the RLS lockdown
-- (migrations 038/039). lib/usage-tracker.logUsage is fire-and-forget and
-- swallows the error, so Azure spend silently stopped being recorded and
-- /admin/usage under-reports. Re-grant the server role its access.

GRANT SELECT, INSERT ON public.balina_usage TO service_role;

-- The id column is a serial/identity in some envs; grant its sequence too so
-- inserts don't fail on nextval. No-op if the sequence name differs / absent.
DO $$
DECLARE seq text;
BEGIN
  SELECT pg_get_serial_sequence('public.balina_usage', 'id') INTO seq;
  IF seq IS NOT NULL THEN
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO service_role', seq);
  END IF;
END $$;
