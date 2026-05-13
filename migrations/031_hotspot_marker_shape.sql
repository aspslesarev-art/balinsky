-- Two hotspot shapes on a visualization layer:
--   polygon — the original: a coloured highlight over a unit footprint.
--   marker  — a small numbered circle placed at a single point.
--             Same click → same popup, just no painted outline.
--
-- Schema keeps the existing `polygon` jsonb column for both shapes:
-- for markers it stores a single [[x, y]] point, for polygons the
-- usual N-vertex ring. Cheaper than splitting the geometry across
-- two columns and lets every existing query keep working unchanged.

ALTER TABLE public.complex_visualization_hotspots
  ADD COLUMN IF NOT EXISTS shape text NOT NULL DEFAULT 'polygon';

ALTER TABLE public.complex_visualization_hotspots
  DROP CONSTRAINT IF EXISTS complex_visualization_hotspots_shape_check;
ALTER TABLE public.complex_visualization_hotspots
  ADD CONSTRAINT complex_visualization_hotspots_shape_check
  CHECK (shape IN ('polygon', 'marker'));
