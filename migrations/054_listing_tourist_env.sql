-- 054 — "is the area around this listing foreign or local", per listing.
--
-- Migration 053 grades every place, but that grade is confounded by popularity:
-- any place with thousands of reviews has five Indonesian ones, so Google's
-- 5-review cap makes even FINNS Beach Club read as "local". The signal only
-- separates on SMALL places — the ones that cannot fill five reviews in either
-- language by accident. So the listing metric samples places with 10..300
-- ratings within 3 km and reports what share of them are foreign-facing.
--
-- Validated against ground truth at zone level: Bingin/Uluwatu/Penestanan/
-- Pererenan come out on top (36-56%), Denpasar/Sukawati/Tabanan at the bottom
-- (9-16%).
--
-- The grade is materialised into a column first. Reading it through the
-- place_tourist_profile view inside the refresh made every listing re-aggregate
-- 20k jsonb histograms, and the rebuild timed out.

alter table public.bali_places add column if not exists tourist_grade text;

with calc as (
  select b.id, b.rev_sampled_id,
         coalesce((select sum(v::int) from jsonb_each_text(b.rev_langs_id) as e(k, v)
                    where k in ('id','jv','su','ms','ban')), 0) as local_n
    from public.bali_places b
   where b.rev_sampled_id is not null
)
update public.bali_places t
   set tourist_grade = case
     when c.local_n = 0                       then 'tourist_only'
     when c.local_n <= c.rev_sampled_id * 0.4 then 'tourist_mostly'
     when c.local_n >= c.rev_sampled_id * 0.8 then 'local'
     else 'mixed' end
  from calc c
 where c.id = t.id;

create index if not exists bali_places_tourist_grade_idx on public.bali_places (tourist_grade);
create index if not exists bali_places_rating_count_idx  on public.bali_places (user_rating_count);

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
           'r1', s.r1, 'r3', s.r3, 'r5', s.r5, 'premium3', s.p3,
           'tourist_env', te.env,
           'top', coalesce(t.top, '[]'::jsonb)
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
           and b.rating >= 4.2 and b.user_rating_count >= 50 and b.bucket <> 'other'
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
    cross join lateral (
      select jsonb_build_object(
               'sampled', count(*),
               'tourist', count(*) filter (where b.tourist_grade in ('tourist_only','tourist_mostly')),
               'share',   case when count(*) >= 10
                               then round(100.0 * count(*) filter (where b.tourist_grade in ('tourist_only','tourist_mostly')) / count(*))
                          end
             ) as env
        from public.bali_places b
       where b.lat between g.lat - 0.03 and g.lat + 0.03
         and b.lng between g.lng - 0.03 and g.lng + 0.03
         and b.tourist_grade is not null
         and b.user_rating_count between 10 and 300
         and public.geo_dist_m(g.lat, g.lng, b.lat, b.lng) <= 3000
    ) te
    left join lateral (
      select jsonb_agg(jsonb_build_object(
               'id', b.id, 'name', b.name, 'bucket', b.bucket, 'type', b.primary_type,
               'rating', b.rating, 'reviews', b.user_rating_count, 'price', b.price_level,
               'lat', b.lat, 'lng', b.lng,
               'dist_m', round(public.geo_dist_m(g.lat, g.lng, b.lat, b.lng))::int,
               'photo', b.data->'photos'->0->>'name',
               'photo_url', b.photo_url, 'photo_attr', b.photo_attr,
               'tourist_grade', b.tourist_grade
             ) order by public.geo_dist_m(g.lat, g.lng, b.lat, b.lng)) as top
        from (
          select b2.* from public.bali_places b2
           where b2.lat between g.lat - 0.05 and g.lat + 0.05
             and b2.lng between g.lng - 0.05 and g.lng + 0.05
             and b2.rating >= 4.5 and b2.user_rating_count >= 300
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
