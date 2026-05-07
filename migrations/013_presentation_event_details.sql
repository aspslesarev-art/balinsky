-- Extend presentation_events with the agent contact (when the user
-- generated a "for-agent" PDF) and the per-item snapshot for shortlist
-- events. The plain `items text[]` was too lossy — admins want to see
-- titles, districts and prices, not raw Airtable ids.
--
-- Both fields are nullable; legacy rows from migration 012 read with
-- nulls and the dashboard handles that.

alter table public.presentation_events
  add column if not exists agent_name      text,
  add column if not exists agent_telegram  text,
  add column if not exists agent_whatsapp  text,
  -- One JSON object per item in the shortlist, in shortlist order.
  -- Capped at 30 items (same cap as `items text[]`) so rows stay
  -- compact. Shape:
  --   {
  --     id, kind, slug, title, district,
  --     bedrooms, area, priceUsd
  --   }
  add column if not exists items_detail    jsonb;
