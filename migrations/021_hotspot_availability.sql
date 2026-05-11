-- Per-hotspot availability override for the interactive ЖК plan.
--
-- Source of truth — what the visitor sees coloured on the panorama:
--   free      — green polygon, popup says "Свободно"
--   reserved  — yellow polygon, popup says "Забронировано"
--   sold      — red polygon (50 % opacity), popup hidden / disabled
--   null      — neutral green, no status badge (default — same as
--               before this migration)
--
-- Stored on the hotspot row rather than on the underlying
-- catalogue listing because (a) availability is intrinsically per-
-- placement (a building's hotspot might be "sold out at this layer
-- → drill into floor", not the same as the unit slug being sold)
-- and (b) keeps mutations local to the visualisation editor.

alter table public.complex_visualization_hotspots
  add column if not exists availability text
    check (availability in ('free', 'reserved', 'sold'));
