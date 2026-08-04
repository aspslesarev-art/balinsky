-- 050 — cache Google place photos in our own Storage instead of paying per view.
--
-- The sweep stored photo RESOURCE NAMES only, so every render went through
-- /api/place-photo, which re-fetches from Google on every edge cache miss and
-- is billed per request. One paid fetch per place, kept in Storage, turns that
-- into a free CDN asset. Attribution is stored alongside: Google requires the
-- photographer credit to be shown wherever the photo appears.

alter table public.bali_places add column if not exists photo_url        text;
alter table public.bali_places add column if not exists photo_attr       text;
alter table public.bali_places add column if not exists photo_fetched_at timestamptz;

-- Work queue for scripts/fetch-place-photos.mjs. Places that already surface in
-- a listing's "nearest premium" list come first — those are the ones a visitor
-- actually sees — then the rest of the premium tier by popularity.
create or replace view public.place_photo_queue as
with top_ids as (
  select distinct t->>'id' as id
    from public.listing_surroundings s,
         lateral jsonb_array_elements(s.data->'top') t
)
select b.id,
       b.data->'photos'->0->>'name'                                as photo_name,
       b.data->'photos'->0->'authorAttributions'->0->>'displayName' as photo_author,
       (b.id in (select id from top_ids))                          as in_top,
       b.rating,
       b.user_rating_count
  from public.bali_places b
 where b.photo_url is null
   and b.photo_count > 0
   and b.rating >= 4.5
   and b.user_rating_count >= 300;

grant select on public.place_photo_queue to service_role;

-- Carry the cached URL into the per-listing payload so the UI never touches
-- Google directly. Body is otherwise identical to migration 049.
create or replace function public.refresh_listing_surroundings()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  n integer;
begin
  insert into public.listing_surroundings (kind, airtable_id, lat, lng, data, updated_at)
  select g.kind, g.airtable_id, g.lat, g.lng,
         jsonb_build_object(
           'r1',       s.r1,
           'r3',       s.r3,
           'r5',       s.r5,
           'premium3', s.p3,
           'top',      coalesce(t.top, '[]'::jsonb)
         ),
         now()
    from public.listing_geo g
    cross join lateral (
      with near as (
        select b.bucket,
               public.geo_dist_m(g.lat, g.lng, b.lat, b.lng) as d,
               (b.rating >= 4.5 and b.user_rating_count >= 300) as premium
          from public.bali_places b
         where b.lat between g.lat - 0.05 and g.lat + 0.05
           and b.lng between g.lng - 0.05 and g.lng + 0.05
           and b.rating >= 4.2
           and b.user_rating_count >= 50
           and b.bucket <> 'other'
      )
      select
        (select coalesce(jsonb_object_agg(bucket, c), '{}'::jsonb)
           from (select bucket, count(*) c from near where d <= 1000 group by 1) x) as r1,
        (select coalesce(jsonb_object_agg(bucket, c), '{}'::jsonb)
           from (select bucket, count(*) c from near where d <= 3000 group by 1) x) as r3,
        (select coalesce(jsonb_object_agg(bucket, c), '{}'::jsonb)
           from (select bucket, count(*) c from near where d <= 5000 group by 1) x) as r5,
        (select coalesce(jsonb_object_agg(bucket, c), '{}'::jsonb)
           from (select bucket, count(*) c from near where d <= 3000 and premium group by 1) x) as p3
    ) s
    left join lateral (
      select jsonb_agg(jsonb_build_object(
               'id',      b.id,
               'name',    b.name,
               'bucket',  b.bucket,
               'type',    b.primary_type,
               'rating',  b.rating,
               'reviews', b.user_rating_count,
               'price',   b.price_level,
               'lat',     b.lat,
               'lng',     b.lng,
               'dist_m',  round(public.geo_dist_m(g.lat, g.lng, b.lat, b.lng))::int,
               'photo',   b.data->'photos'->0->>'name',
               'photo_url',  b.photo_url,
               'photo_attr', b.photo_attr
             ) order by public.geo_dist_m(g.lat, g.lng, b.lat, b.lng)) as top
        from (
          select b2.*
            from public.bali_places b2
           where b2.lat between g.lat - 0.05 and g.lat + 0.05
             and b2.lng between g.lng - 0.05 and g.lng + 0.05
             and b2.rating >= 4.5
             and b2.user_rating_count >= 300
             and b2.bucket not in ('other', 'temple')
             and public.geo_dist_m(g.lat, g.lng, b2.lat, b2.lng) <= 5000
           order by public.geo_dist_m(g.lat, g.lng, b2.lat, b2.lng)
           limit 20
        ) b
    ) t on true
      on conflict (kind, airtable_id) do update
         set lat = excluded.lat, lng = excluded.lng,
             data = excluded.data, updated_at = excluded.updated_at;

  get diagnostics n = row_count;
  return n;
end $fn$;

grant execute on function public.refresh_listing_surroundings() to service_role;
