-- Interactive visualisations for residential complexes (ЖК).
--
-- The admin uploads photos (top-down render of the whole complex,
-- per-building views, floor plans), draws clickable polygons on top
-- of each photo, and links each polygon either to a deeper layer
-- (drill-down: complex → building → floor → unit) or directly to a
-- catalogue listing (villa / apartment / penthouse).
--
-- The public complex page renders the root layer and lets the
-- visitor click through the hierarchy until they land on a specific
-- unit's detail page.
--
-- Schema:
--   layers — one row per photo in the drill-down tree. Self-references
--     via parent_id so layer-1 → layer-2 → layer-3 etc. parent IS
--     NULL for the root (the panorama the visitor first sees).
--   hotspots — clickable polygons drawn on a layer. Each one targets
--     either another layer (target_layer_id) or a catalogue unit
--     (target_unit_kind + target_unit_slug).
--
-- Polygon storage: jsonb array of normalized [x,y] pairs in 0..1
-- range so the geometry is independent of photo dimensions / device
-- pixel ratios. The viewer scales them to whatever <svg viewBox>
-- the rendered photo uses.

create table if not exists public.complex_visualization_layers (
  id                  bigserial primary key,
  complex_airtable_id text not null,
  parent_layer_id     bigint references public.complex_visualization_layers(id) on delete cascade,
  title               text,
  photo_url           text not null,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists complex_viz_layers_complex_idx
  on public.complex_visualization_layers (complex_airtable_id);

create index if not exists complex_viz_layers_parent_idx
  on public.complex_visualization_layers (parent_layer_id);

create table if not exists public.complex_visualization_hotspots (
  id                bigserial primary key,
  layer_id          bigint not null references public.complex_visualization_layers(id) on delete cascade,
  label             text,
  -- Polygon points in normalized 0..1 coords: [[x1,y1],[x2,y2],...]
  polygon           jsonb not null,
  target_type       text not null check (target_type in ('layer', 'unit')),
  target_layer_id   bigint references public.complex_visualization_layers(id) on delete set null,
  target_unit_kind  text check (target_unit_kind in ('villa', 'apartment')),
  target_unit_slug  text,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists complex_viz_hotspots_layer_idx
  on public.complex_visualization_hotspots (layer_id);

grant select, insert, update, delete on table public.complex_visualization_layers   to service_role;
grant select, insert, update, delete on table public.complex_visualization_hotspots to service_role;
grant usage, select on sequence public.complex_visualization_layers_id_seq   to service_role;
grant usage, select on sequence public.complex_visualization_hotspots_id_seq to service_role;

-- Public read for the visitor-facing viewer. Anon role can SELECT,
-- mutations stay service-role only.
grant select on table public.complex_visualization_layers   to anon;
grant select on table public.complex_visualization_hotspots to anon;
